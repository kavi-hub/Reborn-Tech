import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, CircleHelp, Download, FileCheck2, FileText, Gauge, LoaderCircle, Mail, MapPin, Phone, Route as RouteIcon } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { CollectionAuditTimeline } from "@/components/CollectionAuditTimeline";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SiteFooter, SiteHeader } from "@/components/PublicChrome";
import { clientJobStageLabels, clientJobStages, getClientJobLifecycleProgress, type ClientJobStage } from "../../../shared/itadLifecycle";

const collectionStages = ["planned", "confirmed", "collected", "processing", "outcome_reported"] as const;
const collectionLabels: Record<(typeof collectionStages)[number], string> = { planned: "Planned", confirmed: "Booked", collected: "Collected", processing: "Processing", outcome_reported: "Outcome ready" };
const documentLabels: Record<string, string> = { securaze_report: "Securaze evidence", destruction_certificate: "Destruction certificate", impact_statement: "Impact statement", data_erasure: "Data erasure evidence", collection_manifest: "Collection manifest", reuse_outcome: "Reuse outcome", recycling_outcome: "Recycling outcome", other: "Issued document" };

const formatBytes = (bytes: number) => bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1_000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
const formatDate = (value: Date | null | undefined) => value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;
const downloadPdf = (contentBase64: string, fileName: string) => { const bytes = Uint8Array.from(atob(contentBase64), (character) => character.charCodeAt(0)); const href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })); const anchor = document.createElement("a"); anchor.href = href; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(href); };
const downloadPdfFromUrl = (url: string, fileName: string) => { const anchor = document.createElement("a"); anchor.href = url; anchor.download = fileName; anchor.click(); };

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const [auditPage, setAuditPage] = useState(1);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveFrom, setArchiveFrom] = useState("");
  const [archiveTo, setArchiveTo] = useState("");
  const [archiveSort, setArchiveSort] = useState<"newest" | "oldest">("newest");
  const [archiveDocumentType, setArchiveDocumentType] = useState<"securaze_report" | "destruction_certificate" | "impact_statement" | "all">("all");
  const [archivePage, setArchivePage] = useState(1);
  const [preview, setPreview] = useState<{ url: string; fileName: string } | null>(null);
  const session = trpc.clientAuth.me.useQuery();
  const archiveInput = useMemo(() => ({ search: archiveSearch.trim() || undefined, completedFrom: archiveFrom ? new Date(`${archiveFrom}T00:00:00`) : undefined, completedTo: archiveTo ? new Date(`${archiveTo}T23:59:59.999`) : undefined, documentType: archiveDocumentType === "all" ? undefined : archiveDocumentType, sort: archiveSort, page: archivePage, pageSize: 10 }), [archiveDocumentType, archiveFrom, archivePage, archiveSearch, archiveSort, archiveTo]);
  const collections = trpc.clientPortal.collections.useQuery(undefined, { enabled: Boolean(session.data) });
  const attachments = trpc.clientPortal.attachments.useQuery(undefined, { enabled: Boolean(session.data) });
  const auditEvents = trpc.clientPortal.auditEvents.useQuery({ page: auditPage, pageSize: 6 }, { enabled: Boolean(session.data) });
  const coreEvidence = trpc.clientPortal.coreEvidence.useQuery(undefined, { enabled: Boolean(session.data) });
  const lifecycle = trpc.clientPortal.lifecycle.useQuery(undefined, { enabled: Boolean(session.data) });
  const impactStatements = trpc.clientPortal.impactStatements.useQuery(undefined, { enabled: Boolean(session.data) });
  const support = trpc.clientPortal.supportContact.useQuery(undefined, { enabled: Boolean(session.data) });
  const completionArchive = trpc.clientPortal.completionArchive.useQuery(archiveInput, { enabled: Boolean(session.data) });
  const logout = trpc.clientAuth.logout.useMutation({ onSuccess: () => setLocation("/login") });
  const downloadAttachment = trpc.clientPortal.downloadAttachment.useMutation({ onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"), onError: (error) => toast("File could not be opened", { description: error.message }) });
  const downloadEvidence = trpc.clientPortal.downloadCoreEvidence.useMutation({ onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"), onError: (error) => toast("Document could not be opened", { description: error.message }) });
  const completionSummary = trpc.clientPortal.downloadCompletionSummary.useMutation({ onError: (error) => toast("Completion summary could not be generated", { description: error.message }) });

  const fetchCompletionSummary = async (jobId: number, mode: "preview" | "download") => {
    try {
      const { contentBase64, fileName } = await completionSummary.mutateAsync({ jobId });
      if (mode === "download") { downloadPdf(contentBase64, fileName); toast("Completion summary downloaded"); return; }
      const bytes = Uint8Array.from(atob(contentBase64), (character) => character.charCodeAt(0));
      setPreview({ url: URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })), fileName });
    } catch {
      // The mutation error callback already presents the scoped failure state to the client.
    }
  };

  useEffect(() => {
    if (!session.isLoading && !session.data) setLocation("/login");
  }, [session.data, session.isLoading, setLocation]);

  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview?.url]);

  if (session.isLoading || !session.data) return <div className="portal-state"><LoaderCircle className="assessment-spin" size={25} />Checking client access</div>;

  const routes = collections.data ?? [];
  const routeNames = new Map(routes.map((entry) => [entry.collection.id, entry.collection.reference]));
  const pagedEvents = auditEvents.data?.events.map((entry) => ({ ...entry, event: { ...entry.event, summary: `${routeNames.get(entry.collection.id) || "Route"} · ${entry.event.summary}` } }));
  const supportCard = support.data
    ? <a href={`mailto:${support.data.email}?subject=Client%20dashboard%20support`}><CircleHelp size={22} /><span>Need help?<strong>{support.data.contactName}</strong><small><Mail size={13} />{support.data.email}</small>{support.data.phone ? <small><Phone size={13} />{support.data.phone}</small> : null}</span></a>
    : <a href="mailto:reborn@bulkgsm.com?subject=Client%20dashboard%20support"><CircleHelp size={22} /><span>Need help?<strong>Contact Operations</strong><small><Mail size={13} />reborn@bulkgsm.com</small></span></a>;

  return <div className="portal-shell">
    <SiteHeader active="Customer portal" />
    <main className="customer-portal">
      <header className="customer-portal-head">
        <div><p className="asset-label dark-label"><span className="label-dot" />{session.data.brand === "bulk_gsm" ? "BULK GSM" : "REBORN"} / CLIENT ITAD DASHBOARD</p><h1>Your ITAD route. <em>Verified visibility.</em></h1><p>Collection milestones, issued documents and verified non-financial outcomes are shown only for your organisation.</p></div>
        <div className="portal-head-mark"><RouteIcon size={35} /><span>CLIENT<br />TRACK</span><button onClick={() => logout.mutate()}>Sign out</button></div>
      </header>

      <section className="portal-welcome"><div><p className="asset-label dark-label"><span className="label-dot" />WELCOME / SECURE CLIENT ACCESS</p><h2>You are signed in as {session.data.email}.</h2><p>Follow collection routes, download released documents and review verified ITAD outcomes. Your view is limited to your organisation and brand workspace.</p></div>{supportCard}</section>

      {collections.isLoading ? <div className="portal-state"><LoaderCircle className="assessment-spin" size={25} />Opening your collection information</div> : routes.length ? <>
        <section className="portal-lifecycle-list" aria-label="ITAD job lifecycle">
          <div className="portal-section-head"><div><p className="asset-label dark-label"><span className="label-dot" />ITAD LIFECYCLE</p><h2>From collection to <em>verified outcome.</em></h2></div><small>Completion follows document approval, not an automatic claim.</small></div>
          {lifecycle.data?.length ? lifecycle.data.map(({ job, collection }) => {
            const { activeIndex, percent } = getClientJobLifecycleProgress(job.stage);
            const stage = job.stage as ClientJobStage;
            return <article className="portal-job-lifecycle" key={job.id}><div className="portal-card-top"><div><span>{job.jobReference}</span><h3>{job.title}</h3><p>{collection?.reference ? `Collection ${collection.reference}` : "ITAD Core Job"}</p></div><strong className={`portal-status portal-stage-${job.stage}`}>{clientJobStageLabels[stage] || "Intake"}</strong></div><div className="portal-progress-meta"><strong>{percent}% complete</strong><span>Current stage: {clientJobStageLabels[stage] || "Intake"}</span></div><div className="portal-progress-bar" role="progressbar" aria-label={`${job.jobReference} lifecycle progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{ width: `${percent}%` }} /></div><div className="portal-job-route">{clientJobStages.map((currentStage, index) => <div key={currentStage} className={index <= activeIndex ? "is-complete" : ""}><span>{String(index + 1).padStart(2, "0")}</span><i /><small>{clientJobStageLabels[currentStage]}</small></div>)}</div>{job.completedAt ? <div className="portal-completion-note"><span><CheckCircle2 size={16} />Completed {formatDate(job.completedAt)}. Issued documents remain available below.</span><div><button disabled={completionSummary.isPending} onClick={() => fetchCompletionSummary(job.id, "preview")}>{completionSummary.isPending ? <LoaderCircle className="assessment-spin" size={15} /> : <FileText size={15} />}Preview summary</button><button disabled={completionSummary.isPending} onClick={() => fetchCompletionSummary(job.id, "download")}><Download size={15} />Download PDF</button></div></div> : null}</article>;
          }) : <p className="portal-empty-inline">The Core Job lifecycle will appear after Operations opens your collection route.</p>}
        </section>

        <section className="portal-collection-list">
          <CollectionAuditTimeline events={pagedEvents} loading={auditEvents.isLoading} customer page={auditPage} pageSize={6} total={auditEvents.data?.total ?? 0} onPageChange={setAuditPage} />
          {routes.map(({ collection, organisation }) => {
            const routeAttachments = attachments.data?.filter((entry) => entry.collection.id === collection.id) ?? [];
            const activeIndex = collectionStages.indexOf(collection.status as (typeof collectionStages)[number]);
            return <article key={collection.id} className="portal-collection-card"><div className="portal-card-top"><div><span>{collection.reference}</span><h2>{collection.title}</h2><p>{organisation.name} · Client dashboard</p></div><strong className={`portal-status portal-status-${collection.status}`}>{collectionLabels[collection.status as (typeof collectionStages)[number]]}</strong></div><div className="portal-route">{collectionStages.map((stage, index) => <div key={stage} className={index <= activeIndex ? "is-complete" : ""}><span>{String(index + 1).padStart(2, "0")}</span><i /><small>{collectionLabels[stage]}</small></div>)}</div><div className="portal-card-meta"><span><CalendarDays size={16} />{collection.scheduledFor ? `Scheduled ${formatDate(collection.scheduledFor)}` : "Collection date to be confirmed"}</span><span><MapPin size={16} />{collection.collectionPostcode || "Collection location held by Operations"}</span></div><section className="portal-route-files"><div><FileText size={17} /><span>ROUTE DOCUMENTS</span></div>{routeAttachments.length ? <ul>{routeAttachments.map(({ attachment }) => <li key={attachment.id}><FileText size={17} /><div><strong>{attachment.fileName}</strong><small>{attachment.attachmentType === "inventory" ? "Asset inventory" : "Collection evidence"} · {formatBytes(attachment.sizeBytes)}</small></div><button onClick={() => downloadAttachment.mutate({ attachmentId: attachment.id })}><Download size={16} />Open</button></li>)}</ul> : <p>No customer-visible route files have been added yet.</p>}</section></article>;
          })}
        </section>

        <section className="portal-completion-archive" aria-label="Completion summary archive"><div className="portal-section-head"><div><p className="asset-label dark-label"><span className="label-dot" />COMPLETION ARCHIVE</p><h2>Past summaries, <em>ready when needed.</em></h2></div><small>Only completed Core Jobs in your organisation are listed.</small></div><div className="portal-archive-filters"><label>Find a job<input value={archiveSearch} onChange={(event) => { setArchiveSearch(event.target.value); setArchivePage(1); }} placeholder="Reference or title" /></label><label>Completed from<input type="date" value={archiveFrom} onChange={(event) => { setArchiveFrom(event.target.value); setArchivePage(1); }} /></label><label>Completed to<input type="date" value={archiveTo} onChange={(event) => { setArchiveTo(event.target.value); setArchivePage(1); }} /></label><label>Issued document<select value={archiveDocumentType} onChange={(event) => { setArchiveDocumentType(event.target.value as typeof archiveDocumentType); setArchivePage(1); }}><option value="all">All summaries</option><option value="securaze_report">Securaze evidence</option><option value="destruction_certificate">Destruction certificates</option><option value="impact_statement">Impact statements</option></select></label><label>Order<select value={archiveSort} onChange={(event) => { setArchiveSort(event.target.value as "newest" | "oldest"); setArchivePage(1); }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div>{completionArchive.isLoading ? <p className="portal-empty-inline"><LoaderCircle className="assessment-spin" size={16} />Loading completed jobs</p> : completionArchive.data?.items.length ? <><div className="portal-archive-list">{completionArchive.data.items.map(({ job, collection }) => <article key={job.id}><div><span>{job.jobReference}</span><h3>{job.title}</h3><p>{collection?.reference ? `Collection ${collection.reference} · ` : ""}Completed {formatDate(job.completedAt)}</p></div><div className="portal-archive-actions"><button disabled={completionSummary.isPending} onClick={() => fetchCompletionSummary(job.id, "preview")}>{completionSummary.isPending ? <LoaderCircle className="assessment-spin" size={15} /> : <FileText size={15} />}Preview</button><button disabled={completionSummary.isPending} onClick={() => fetchCompletionSummary(job.id, "download")}><Download size={15} />Download</button></div></article>)}</div>{completionArchive.data.pageCount > 1 ? <nav className="portal-archive-pagination" aria-label="Completion archive pagination"><button disabled={archivePage === 1} onClick={() => setArchivePage((page) => page - 1)}>Previous</button><span>Page {completionArchive.data.page} of {completionArchive.data.pageCount} · {completionArchive.data.total} summaries</span><button disabled={archivePage === completionArchive.data.pageCount} onClick={() => setArchivePage((page) => page + 1)}>Next</button></nav> : null}</> : <p className="portal-empty-inline">No completed jobs match these archive filters.</p>}</section>

        <section className="portal-route-files portal-evidence"><div><FileCheck2 size={17} /><span>ISSUED CLIENT DOCUMENTS</span></div>{coreEvidence.data?.length ? <ul>{coreEvidence.data.map(({ evidence, job }) => <li key={evidence.id}><FileCheck2 size={17} /><div><strong>{documentLabels[evidence.evidenceType] || "Issued document"}</strong><small>{evidence.fileName || evidence.certificateReference || "Issued record"} · {job.jobReference}{evidence.issuer ? ` · ${evidence.issuer}` : ""}</small></div>{evidence.fileName ? <button onClick={() => downloadEvidence.mutate({ evidenceId: evidence.id })}><Download size={16} />Open</button> : null}</li>)}</ul> : <p>No approved Securaze evidence or completion certificates have been issued yet.</p>}</section>

        <section className="portal-impact-list" aria-label="Verified impact statements"><div className="portal-section-head"><div><p className="asset-label dark-label"><span className="label-dot" />VERIFIED IMPACT</p><h2>Outcome without <em>commercial detail.</em></h2></div><small>Only operator-approved non-financial outcomes are shown.</small></div>{impactStatements.data?.length ? impactStatements.data.map(({ impact, job }) => <article className="portal-impact-card" key={impact.id}><div><span>{job.jobReference}</span><h3>{job.title}</h3>{impact.narrative ? <p>{impact.narrative}</p> : <p>Verified outcomes recorded for this ITAD route.</p>}</div><dl><div><dt>Reused</dt><dd>{impact.assetsReused}</dd></div><div><dt>Recycled</dt><dd>{impact.assetsRecycled}</dd></div><div><dt>Redistributed</dt><dd>{impact.assetsRedistributed}</dd></div><div><dt>Materials recovered</dt><dd>{impact.materialsRecoveredKg} kg</dd></div>{impact.carbonAvoidedKg !== null && impact.carbonMethodology ? <div><dt>Carbon avoided</dt><dd>{impact.carbonAvoidedKg} kg CO₂e<small>{impact.carbonMethodology}</small></dd></div> : null}</dl></article>) : <p className="portal-empty-inline">An impact statement will appear once Operations verifies and releases the outcome.</p>}</section>
      </> : <section className="portal-empty"><p className="asset-label dark-label"><span className="label-dot" />NO TRACKED ROUTES YET</p><h2>Your access is active.</h2><p>Once a collection is planned, Operations will add it here and you will receive your next milestone update.</p></section>}
      </main>
      <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}><DialogContent className="completion-preview-dialog"><DialogHeader><DialogTitle>Completion summary preview</DialogTitle><DialogDescription>{preview?.fileName || "Your generated completion summary"}</DialogDescription></DialogHeader>{preview ? <iframe title="Completion summary PDF preview" src={preview.url} className="completion-preview-frame" /> : null}<div className="completion-preview-actions"><button onClick={() => { if (preview) downloadPdfFromUrl(preview.url, preview.fileName); }}>Download PDF</button></div></DialogContent></Dialog>
    <SiteFooter />
  </div>;
}
