/**
 * Reborn Operations Desk: an admin-only assessment queue designed for rapid triage,
 * clear status ownership and defensible handling of enquiry records.
 */
import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import type { AssessmentRequest } from "../../../drizzle/schema";

const STATUSES = ["new", "contacted", "qualified", "closed"] as const;
type Status = (typeof STATUSES)[number];
type Enquiry = AssessmentRequest;

function statusClass(status: Status) { return `ops-status ops-status-${status}`; }
function statusTitle(status: Status) { return status === "new" ? "New" : status[0].toUpperCase() + status.slice(1); }

export default function OperationsDashboard() {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const utils = trpc.useUtils();
  const input = useMemo(() => ({ search: search || undefined, status: status === "all" ? undefined : status, sort, page, limit: 12 }), [search, status, sort, page]);
  const enquiries = trpc.assessment.list.useQuery(input, { enabled: user?.role === "admin" });
  const updateStatus = trpc.assessment.updateStatus.useMutation({
    onSuccess: () => { utils.assessment.list.invalidate(); toast("Enquiry status updated"); },
    onError: (error) => toast("Status could not be updated", { description: error.message }),
  });
  const deleteRequest = trpc.assessment.delete.useMutation({
    onSuccess: () => { setSelected(null); utils.assessment.list.invalidate(); toast("Enquiry deleted"); },
    onError: (error) => toast("Enquiry could not be deleted", { description: error.message }),
  });

  const setFilter = (next: Status | "all") => { setStatus(next); setPage(1); };
  const totalPages = Math.max(1, Math.ceil((enquiries.data?.total ?? 0) / 12));

  return <DashboardLayout><div className="ops-page">
    <header className="ops-heading"><div><p className="ops-kicker">REBORN / OPERATIONS DESK</p><h1>Assessment enquiries</h1><p>New public requests are held here for triage, a clear next action and appropriate record handling.</p></div><a href="/" target="_blank" rel="noreferrer" className="ops-public-link">View public site <ExternalLink size={15} /></a></header>
    {loading ? <div className="ops-loading"><LoaderCircle className="assessment-spin" size={24} />Loading access</div> : user?.role !== "admin" ? <section className="ops-access-card"><p className="ops-kicker">RESTRICTED ROUTE</p><h2>Operations access is for Reborn admins.</h2><p>Your current account is not assigned the required role. Ask an existing administrator to update your role before using this desk.</p></section> : <>
      <section className="ops-summary" aria-label="Assessment enquiry status summary"><article><span>ALL REQUESTS</span><strong>{enquiries.data?.total ?? "—"}</strong><p>Visible under the current filter</p></article>{STATUSES.map((key) => <button key={key} className={`ops-summary-filter ${status === key ? "is-active" : ""}`} onClick={() => setFilter(status === key ? "all" : key)}><span>{key.toUpperCase()}</span><strong>{enquiries.data?.statusCounts[key] ?? "—"}</strong><p>{status === key ? "Clear filter" : "Filter queue"}</p></button>)}</section>
      <section className="ops-controls"><label className="ops-search"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, company, email or postcode" /></label><label>STATUS<select value={status} onChange={(event) => setFilter(event.target.value as Status | "all")}><option value="all">All statuses</option>{STATUSES.map((key) => <option key={key} value={key}>{statusTitle(key)}</option>)}</select></label><label>ORDER<select value={sort} onChange={(event) => { setSort(event.target.value as "newest" | "oldest"); setPage(1); }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></section>
      <section className="ops-grid"><div className="ops-table-card"><div className="ops-table-title"><span>LIVE QUEUE</span><small>{enquiries.data?.total ?? 0} assessment{(enquiries.data?.total ?? 0) === 1 ? "" : "s"}</small></div>{enquiries.isLoading ? <div className="ops-loading"><LoaderCircle className="assessment-spin" size={22} />Loading enquiries</div> : enquiries.data?.items.length ? <div className="ops-table-wrap"><table><thead><tr><th>Requester</th><th>Asset scope</th><th>Status</th><th>Received</th><th /></tr></thead><tbody>{enquiries.data.items.map((item) => <tr key={item.id} className={selected?.id === item.id ? "is-selected" : ""}><td><button className="ops-person" onClick={() => setSelected(item)}><strong>{item.organisation}</strong><span>{item.fullName} · {item.email}</span></button></td><td><span className="ops-assets">{item.assetCategories}</span><small>{item.approximateAssetCount || "Quantity not stated"}</small></td><td><span className={statusClass(item.status)}>{statusTitle(item.status)}</span></td><td><span className="ops-date">{item.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span></td><td><button className="ops-view" onClick={() => setSelected(item)}>Review <ArrowUpRight size={14} /></button></td></tr>)}</tbody></table></div> : <div className="ops-empty"><p>No assessment enquiries match this view.</p><span>When a public assessment is submitted, it will appear here.</span></div>}<footer className="ops-pagination"><button disabled={page === 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={17} />Previous</button><span>Page {page} of {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next<ChevronRight size={17} /></button></footer></div>
        <aside className="ops-detail">{selected ? <><div className="ops-detail-head"><div><p className="ops-kicker">ENQUIRY / {String(selected.id).padStart(4, "0")}</p><h2>{selected.organisation}</h2><span>{selected.fullName}</span></div><span className={statusClass(selected.status)}>{statusTitle(selected.status)}</span></div><div className="ops-status-controls"><span>SET STATUS</span>{STATUSES.map((key) => <button key={key} disabled={updateStatus.isPending || selected.status === key} onClick={() => updateStatus.mutate({ id: selected.id, status: key })}>{statusTitle(key)}</button>)}</div><dl className="ops-detail-list"><div><dt>Contact</dt><dd><a href={`mailto:${selected.email}`}>{selected.email}</a>{selected.phone ? <><br />{selected.phone}</> : null}</dd></div><div><dt>Collection</dt><dd>{selected.sitePostcode || "Not stated"}<br />{selected.collectionTimeline || "Timing not stated"}</dd></div><div><dt>Assets</dt><dd>{selected.assetCategories}<br />{selected.approximateAssetCount || "Quantity not stated"}</dd></div><div><dt>Data route</dt><dd>{selected.dataSecurityRequirement || "Not specified"}{selected.requiresOnSiteErasure ? <><br />On-site erasure flagged</> : null}</dd></div><div><dt>Inventory</dt><dd>{selected.hasInventory ? "Available" : "Not yet available"}</dd></div>{selected.notes ? <div className="ops-notes"><dt>Notes</dt><dd>{selected.notes}</dd></div> : null}</dl><div className="ops-detail-footer"><span>Retention review: {selected.retentionReviewAt ? selected.retentionReviewAt.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "Not set"}</span><button className="ops-delete" onClick={() => { if (window.confirm("Permanently delete this assessment enquiry?")) deleteRequest.mutate({ id: selected.id }); }} disabled={deleteRequest.isPending}><Trash2 size={14} />Delete</button></div></> : <div className="ops-detail-empty"><p className="ops-kicker">SELECT AN ENQUIRY</p><h2>Review the detail, then choose the next status.</h2><p>The record panel keeps contact, assets, data route and notes together for an accountable handover.</p></div>}</aside></section>
    </>}</div></DashboardLayout>;
}
