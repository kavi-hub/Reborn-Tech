/** Bulk GSM ITAD Dash: a separate brand workspace consuming the shared ITAD Core Job model. */
import { Activity, Box, ClipboardPlus, LoaderCircle, Network, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const stageLabel = (stage: string) => stage.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function BulkItadDash() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const jobs = trpc.collections.listAdmin.useQuery({ brand: "bulk_gsm" }, { enabled: user?.role === "admin" });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ organisationName: "", reference: "", title: "", collectionPostcode: "" });
  const create = trpc.collections.create.useMutation({
    onSuccess: () => { utils.collections.listAdmin.invalidate({ brand: "bulk_gsm" }); setForm({ organisationName: "", reference: "", title: "", collectionPostcode: "" }); setOpen(false); toast("Bulk GSM ITAD Core Job opened"); },
    onError: (error) => toast("Job could not be opened", { description: error.message }),
  });

  if (loading) return <DashboardLayout><div className="ops-loading"><LoaderCircle className="assessment-spin" size={24} />Loading ITAD Dash</div></DashboardLayout>;
  if (user?.role !== "admin") return <DashboardLayout><section className="ops-access-card"><p className="ops-kicker">RESTRICTED ROUTE</p><h2>ITAD Dash is for Bulk GSM administrators.</h2><p>Sign in with an approved operations account to open Bulk GSM Core jobs.</p></section></DashboardLayout>;

  return <DashboardLayout><div className="bulk-dash">
    <header className="bulk-dash-head"><div><p className="ops-kicker">BULK GSM / ITAD DASH</p><h1>Operational intelligence, <em>one shared Core.</em></h1><p>Bulk GSM routes run through the same ITAD Core, while Reborn retains its own customer experience and brand skin.</p></div><button className="button button-lime" onClick={() => setOpen((value) => !value)}>{open ? "Close" : <><Plus size={17} />Open Core Job</>}</button></header>
    {open ? <section className="bulk-create"><p className="ops-kicker">NEW BULK GSM JOB</p><div className="bulk-create-grid"><label>Organisation<input value={form.organisationName} onChange={(event) => setForm({ ...form, organisationName: event.target.value })} placeholder="Customer organisation" /></label><label>Job reference<input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} placeholder="BG-2026-001" /></label><label>Job title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Corporate asset collection" /></label><label>Collection postcode<input value={form.collectionPostcode} onChange={(event) => setForm({ ...form, collectionPostcode: event.target.value })} placeholder="Site postcode" /></label></div><button className="button button-dark" disabled={create.isPending} onClick={() => create.mutate({ brand: "bulk_gsm", organisationName: form.organisationName, reference: form.reference, title: form.title, collectionPostcode: form.collectionPostcode || undefined })}>{create.isPending ? <LoaderCircle className="assessment-spin" size={17} /> : <ClipboardPlus size={17} />}Create Bulk GSM Job</button></section> : null}
    <section className="bulk-metrics"><article><Network size={22} /><span>Core partition</span><strong>Bulk GSM</strong></article><article><Box size={22} /><span>Open ITAD jobs</span><strong>{jobs.data?.length ?? 0}</strong></article><article><Activity size={22} /><span>Shared model</span><strong>Jobs · evidence · audit</strong></article></section>
    <section className="bulk-job-table"><div className="bulk-job-table-head"><p className="ops-kicker">BULK GSM CORE JOBS</p><span>{jobs.data?.length ?? 0} active routes</span></div>{jobs.isLoading ? <div className="ops-loading"><LoaderCircle className="assessment-spin" size={20} />Loading Bulk GSM jobs</div> : jobs.data?.length ? <div>{jobs.data.map((row) => <article key={row.collection.id}><div><span>{row.collection.reference}</span><strong>{row.collection.title}</strong><small>{row.organisation.name} · {row.collection.collectionPostcode || "Postcode not stated"}</small></div><div className="bulk-stage"><span>CORE STAGE</span><strong>{row.job ? stageLabel(row.job.stage) : stageLabel(row.collection.status)}</strong></div></article>)}</div> : <div className="ops-empty"><p>No Bulk GSM Core jobs yet.</p><span>Open the first job to begin its secure ITAD route.</span></div>}</section>
  </div></DashboardLayout>;
}
