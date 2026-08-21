import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, CircleHelp, Download, FileCheck2, FileText, Gauge, LoaderCircle, Mail, MapPin, Phone, Route as RouteIcon } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { CollectionAuditTimeline } from "@/components/CollectionAuditTimeline";
import { SiteFooter, SiteHeader } from "@/components/PublicChrome";
import { clientJobStageLabels, clientJobStages, getClientJobLifecycleProgress, type ClientJobStage } from "../../../shared/itadLifecycle";

const collectionStages = ["planned", "confirmed", "collected", "processing", "outcome_reported"] as const;
const collectionLabels: Record<(typeof collectionStages)[number], string> = { planned: "Planned", confirmed: "Booked", collected: "Collected", processing: "Processing", outcome_reported: "Outcome ready" };
const documentLabels: Record<string, string> = { securaze_report: "Securaze evidence", destruction_certificate: "Destruction certificate", impact_statement: "Impact statement", data_erasure: "Data erasure evidence", collection_manifest: "Collection manifest", reuse_outcome: "Reuse outcome", recycling_outcome: "Recycling outcome", other: "Issued document" };

const formatBytes = (bytes: number) => bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1_000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
const formatDate = (value: Date | null | undefined) => value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;
const downloadPdf = (contentBase64: string, fileName: string) => { const bytes = Uint8Array.from(atob(contentBase64), (character) => character.charCodeAt(0)); const href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })); const anchor = document.createElement("a"); anchor.href = href; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(href); };

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const [auditPage, setAuditPage] = useState(1);
  const session = trpc.clientAuth.me.useQuery();
  const collections = trpc.clientPortal.collections.useQuery(undefined, { enabled: Boolean(session.data) });
  const attachments = trpc.clientPortal.attachments.useQuery(undefined, { enabled: Boolean(session.data) });
  const auditEvents = trpc.clientPortal.auditEvents.useQuery({ page: auditPage, pageSize: 6 }, { enabled: Boolean(session.data) });
  const coreEvidence = trpc.clientPortal.coreEvidence.useQuery(undefined, { enabled: Boolean(session.data) });
  const lifecycle = trpc.clientPortal.lifecycle.useQuery(undefined, { enabled: Boolean(session.data) });
  const impactStatements = trpc.clientPortal.impactStatements.useQuery(undefined, { enabled: Boolean(session.data) });
  const support = trpc.clientPortal.supportContact.useQuery(undefined, { enabled: Boolean(session.data) });
  const logout = trpc.clientAuth.logout.useMutation({ onSuccess: () => setLocation("/login") });
  const downloadAttachment = trpc.clientPortal.downloadAttachment.useMutation({ onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"), onError: (error) => toast("File could not be opened", { description: error.message }) });
  const downloadEvidence = trpc.clientPortal.downloadCoreEvidence.useMutation({ onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"), onError: (error) => toast("Document could not be opened", { description: error.message }) });
  const downloadCompletionSummary = trpc.clientPortal.downloadCompletionSummary.useMutation({ onSuccess: ({ contentBase64, fileName }) => { downloadPdf(contentBase64, fileName); toast("Completion summary downloaded"); }, onError: (error) => toast("Completion summary could not be generated", { description: error.message }) });

  useEffect(() => {
    if (!session.isLoading && !session.data) setLocation("/login");
  }, [session.data, session.isLoading, setLocation]);

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
            return <article className="portal-job-lifecycle" key={job.id}><div className="portal-card-top"><div><span>{job.jobReference}</span><h3>{job.title}</h3><p>{collection?.reference ? `Collection ${collection.reference}` : "ITAD Core Job"}</p></div><strong className={`portal-status portal-stage-${job.stage}`}>{clientJobStageLabels[stage] || "Intake"}</strong></div><div className="portal-progress-meta"><strong>{percent}% complete</strong><span>Current stage: {clientJobStageLabels[stage] || "Intake"}</span></div><div className="portal-progress-bar" role="progressbar" aria-label={`${job.jobReference} lifecycle progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{ width: `${percent}%` }} /></div><div className="portal-job-route">{clientJobStages.map((currentStage, index) => <div key={currentStage} className={index <= activeIndex ? "is-complete" : ""}><span>{String(index + 1).padStart(2, "0")}</span><i /><small>{clientJobStageLabels[currentStage]}</small></div>)}</div>{job.completedAt ? <div className="portal-completion-note"><span><CheckCircle2 size={16} />Completed {formatDate(job.completedAt)}. Issued documents remain available below.</span><button disabled={downloadCompletionSummary.isPending} onClick={() => downloadCompletionSummary.mutate({ jobId: job.id })}>{downloadCompletionSummary.isPending ? <LoaderCircle className="assessment-spin" size={15} /> : <Download size={15} />}Completion summary PDF</button></div> : null}</article>;
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

        <section className="portal-route-files portal-evidence"><div><FileCheck2 size={17} /><span>ISSUED CLIENT DOCUMENTS</span></div>{coreEvidence.data?.length ? <ul>{coreEvidence.data.map(({ evidence, job }) => <li key={evidence.id}><FileCheck2 size={17} /><div><strong>{documentLabels[evidence.evidenceType] || "Issued document"}</strong><small>{evidence.fileName || evidence.certificateReference || "Issued record"} · {job.jobReference}{evidence.issuer ? ` · ${evidence.issuer}` : ""}</small></div>{evidence.fileName ? <button onClick={() => downloadEvidence.mutate({ evidenceId: evidence.id })}><Download size={16} />Open</button> : null}</li>)}</ul> : <p>No approved Securaze evidence or completion certificates have been issued yet.</p>}</section>

        <section className="portal-impact-list" aria-label="Verified impact statements"><div className="portal-section-head"><div><p className="asset-label dark-label"><span className="label-dot" />VERIFIED IMPACT</p><h2>Outcome without <em>commercial detail.</em></h2></div><small>Only operator-approved non-financial outcomes are shown.</small></div>{impactStatements.data?.length ? impactStatements.data.map(({ impact, job }) => <article className="portal-impact-card" key={impact.id}><div><span>{job.jobReference}</span><h3>{job.title}</h3>{impact.narrative ? <p>{impact.narrative}</p> : <p>Verified outcomes recorded for this ITAD route.</p>}</div><dl><div><dt>Reused</dt><dd>{impact.assetsReused}</dd></div><div><dt>Recycled</dt><dd>{impact.assetsRecycled}</dd></div><div><dt>Redistributed</dt><dd>{impact.assetsRedistributed}</dd></div><div><dt>Materials recovered</dt><dd>{impact.materialsRecoveredKg} kg</dd></div>{impact.carbonAvoidedKg !== null && impact.carbonMethodology ? <div><dt>Carbon avoided</dt><dd>{impact.carbonAvoidedKg} kg CO₂e<small>{impact.carbonMethodology}</small></dd></div> : null}</dl></article>) : <p className="portal-empty-inline">An impact statement will appear once Operations verifies and releases the outcome.</p>}</section>
      </> : <section className="portal-empty"><p className="asset-label dark-label"><span className="label-dot" />NO TRACKED ROUTES YET</p><h2>Your access is active.</h2><p>Once a collection is planned, Operations will add it here and you will receive your next milestone update.</p></section>}
    </main>
    <SiteFooter />
  </div>;
}
