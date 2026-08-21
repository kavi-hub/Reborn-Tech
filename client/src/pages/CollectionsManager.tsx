/** Reborn Operations: collection routes are the Reborn skin over the shared ITAD Core Job record. */
import { ChangeEvent, useState } from "react";
import { ArrowUpRight, Ban, Check, ClipboardPlus, Clock3, Copy, Download, FileText, LoaderCircle, Mail, Paperclip, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { CollectionAuditTimeline } from "@/components/CollectionAuditTimeline";
import { CoreJobRecordsPanel } from "@/components/CoreJobRecordsPanel";
import { ClientAccountControls } from "@/components/ClientAccountControls";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const statuses = ["planned", "confirmed", "collected", "processing", "outcome_reported"] as const;
const statusLabel = (status: (typeof statuses)[number]) => status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const attachmentLabel = (type: "inventory" | "evidence") => type === "inventory" ? "Asset inventory" : "Evidence file";
const formatBytes = (bytes: number) => bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1_000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
const contentTypes: Record<string, string> = { pdf: "application/pdf", csv: "text/csv", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(new Error("The file could not be read")); reader.readAsDataURL(file); });

export default function CollectionsManager() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const collections = trpc.collections.listAdmin.useQuery({ brand: "reborn" }, { enabled: user?.role === "admin" });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [form, setForm] = useState({ organisationName: "", reference: "", title: "", collectionPostcode: "", scheduledFor: "", customerNote: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "viewer">("viewer");
  const [inviteLink, setInviteLink] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState<"inventory" | "evidence">("inventory");
  const [customerVisible, setCustomerVisible] = useState(true);

  const selected = collections.data?.find((row) => row.collection.id === selectedId) ?? collections.data?.[0];
  const attachments = trpc.collections.listAttachments.useQuery({ collectionId: selected?.collection.id ?? 0 }, { enabled: Boolean(selected) });
  const audit = trpc.collections.listAudit.useQuery({ collectionId: selected?.collection.id ?? 0, page: auditPage, pageSize: 6 }, { enabled: Boolean(selected) });
  const invitations = trpc.collections.listInvitations.useQuery({ organisationId: selected?.organisation.id ?? 0, brand: "reborn" }, { enabled: Boolean(selected) });
  const refreshRoute = () => { utils.collections.listAdmin.invalidate({ brand: "reborn" }); utils.collections.listAttachments.invalidate(); utils.collections.listAudit.invalidate(); utils.collections.listInvitations.invalidate(); };

  const create = trpc.collections.create.useMutation({
    onSuccess: () => { refreshRoute(); setForm({ organisationName: "", reference: "", title: "", collectionPostcode: "", scheduledFor: "", customerNote: "" }); toast("Collection route and ITAD Core Job created"); },
    onError: (error) => toast("Collection could not be created", { description: error.message }),
  });
  const updateStatus = trpc.collections.updateStatus.useMutation({ onSuccess: () => { refreshRoute(); toast("Route status and ITAD Core Job stage updated"); }, onError: (error) => toast("Status could not be updated", { description: error.message }) });
  const createInvitation = trpc.collections.createInvitation.useMutation({
    onSuccess: ({ token, delivered }) => { const link = `${window.location.origin}/login?invite=${token}`; setInviteLink(link); invitations.refetch(); toast(delivered ? "Invitation email sent" : "Invitation created; email delivery needs attention", { description: delivered ? "The client can now set their dashboard password." : "Copy the secure activation link while delivery is reviewed." }); },
    onError: (error) => toast("Invitation could not be created", { description: error.message }),
  });
  const resendInvitation = trpc.collections.resendInvitation.useMutation({ onSuccess: ({ delivered }) => { invitations.refetch(); toast(delivered ? "Invitation email resent" : "Invitation email could not be sent", { description: delivered ? "A refreshed password-activation email has been sent." : "Use the secure activation link while delivery is reviewed." }); }, onError: (error) => toast("Invitation could not be resent", { description: error.message }) });
  const revokeInvitation = trpc.collections.revokeInvitation.useMutation({ onSuccess: () => { invitations.refetch(); refreshRoute(); toast("Invitation revoked", { description: "The activation link can no longer be used to set a password." }); }, onError: (error) => toast("Invitation could not be revoked", { description: error.message }) });
  const uploadAttachment = trpc.collections.uploadAttachment.useMutation({ onSuccess: () => { setAttachmentFile(null); setAttachmentType("inventory"); setCustomerVisible(true); refreshRoute(); toast("Route attachment saved"); }, onError: (error) => toast("Attachment could not be saved", { description: error.message }) });
  const deleteAttachment = trpc.collections.deleteAttachment.useMutation({ onSuccess: () => { refreshRoute(); toast("Attachment removed"); }, onError: (error) => toast("Attachment could not be removed", { description: error.message }) });
  const downloadAttachment = trpc.collections.downloadAttachment.useMutation({ onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"), onError: (error) => toast("Attachment could not be opened", { description: error.message }) });

  const createRoute = () => create.mutate({ brand: "reborn", organisationName: form.organisationName, reference: form.reference, title: form.title, collectionPostcode: form.collectionPostcode || undefined, scheduledFor: form.scheduledFor ? new Date(`${form.scheduledFor}T09:00:00Z`) : undefined, customerNote: form.customerNote || undefined });
  const createInvite = () => selected && createInvitation.mutate({ organisationId: selected.organisation.id, brand: "reborn", email: inviteEmail, role: inviteRole });
  const chooseAttachment = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0] ?? null; if (!file) return; if (file.size > 10_000_000) { toast("File is too large", { description: "Use a file of 10 MB or less." }); event.target.value = ""; return; } setAttachmentFile(file); };
  const submitAttachment = async () => { if (!attachmentFile || !selected) return; try { const extension = attachmentFile.name.split(".").pop()?.toLowerCase() ?? ""; uploadAttachment.mutate({ collectionId: selected.collection.id, attachmentType, fileName: attachmentFile.name, contentType: contentTypes[extension] ?? attachmentFile.type, contentBase64: await fileToBase64(attachmentFile), customerVisible }); } catch (error) { toast("Attachment could not be read", { description: error instanceof Error ? error.message : "Try a different file." }); } };
  const copyInvite = async () => { try { await navigator.clipboard.writeText(inviteLink); toast("Invitation link copied"); } catch { toast("Copy the link manually", { description: "Your browser blocked clipboard access." }); } };
  const invitationLabel = (status: "pending" | "claimed" | "revoked" | "expired") => status === "pending" ? "Active link" : status === "claimed" ? "Opened" : status === "expired" ? "Expired" : "Revoked";

  if (loading) return <DashboardLayout><div className="ops-loading"><LoaderCircle className="assessment-spin" size={24} />Loading access</div></DashboardLayout>;
  if (user?.role !== "admin") return <DashboardLayout><section className="ops-access-card"><p className="ops-kicker">RESTRICTED ROUTE</p><h2>Collection management is for Reborn admins.</h2><p>Ask an existing administrator to update your role before creating customer-visible collection routes.</p></section></DashboardLayout>;

  return <DashboardLayout><div className="collections-manager">
    <header className="ops-heading"><div><p className="ops-kicker">REBORN / COLLECTION CONTROL</p><h1>Customer collection routes</h1><p>Build the client route, send one branded email and retain operational control.</p></div></header>
    <div className="collections-manager-grid">
      <section className="collection-create"><p className="ops-kicker">OPEN A TRACKED ROUTE</p><h2>Create collection</h2><div className="collection-form-grid">
        <label>Customer organisation<input value={form.organisationName} onChange={(event) => setForm({ ...form, organisationName: event.target.value })} placeholder="Organisation name" /></label>
        <label>Collection reference<input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} placeholder="RB-2026-001" /></label>
        <label className="wide">Route title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="London device collection" /></label>
        <label>Collection postcode<input value={form.collectionPostcode} onChange={(event) => setForm({ ...form, collectionPostcode: event.target.value })} placeholder="NW10 2XA" /></label>
        <label>Scheduled date<input type="date" value={form.scheduledFor} onChange={(event) => setForm({ ...form, scheduledFor: event.target.value })} /></label>
        <label className="wide">Customer note<textarea value={form.customerNote} onChange={(event) => setForm({ ...form, customerNote: event.target.value })} placeholder="A concise customer-visible next-step note." rows={3} /></label>
      </div><button className="button button-dark" disabled={create.isPending} onClick={createRoute}>{create.isPending ? <LoaderCircle className="assessment-spin" size={17} /> : <ClipboardPlus size={17} />}Create tracked route</button></section>
      <section className="collection-list"><div className="collection-list-title"><p className="ops-kicker">ACTIVE & RECENT</p><span>{collections.data?.length ?? 0} routes</span></div>{collections.isLoading ? <div className="ops-loading"><LoaderCircle className="assessment-spin" size={22} />Loading routes</div> : collections.data?.length ? <div>{collections.data.map((row) => <button key={row.collection.id} className={`collection-list-item ${selected?.collection.id === row.collection.id ? "is-active" : ""}`} onClick={() => { setSelectedId(row.collection.id); setAuditPage(1); setInviteLink(""); }}><span>{row.collection.reference}</span><strong>{row.collection.title}</strong><small>{row.organisation.name} · {statusLabel(row.collection.status)}</small><ArrowUpRight size={15} /></button>)}</div> : <div className="ops-empty"><p>No tracked collection routes yet.</p><span>Create the first route to make it available for an invited customer.</span></div>}</section>
    </div>
    <ClientAccountControls brand="reborn" workspace="Reborn Operations" />
    {selected ? <section className="collection-detail">
      <div><p className="ops-kicker">ROUTE / {selected.collection.reference}</p><h2>{selected.collection.title}</h2><p>{selected.organisation.name} · {selected.collection.collectionPostcode || "Postcode not stated"}</p>{selected.job ? <p className="core-job-chip">ITAD CORE JOB / {selected.job.jobReference} · {selected.job.stage.replaceAll("_", " ")}</p> : null}</div>
      <div className="collection-status-row"><span>VISIBLE STATUS</span>{statuses.map((status) => <button key={status} className={selected.collection.status === status ? "is-active" : ""} disabled={updateStatus.isPending || selected.collection.status === status} onClick={() => updateStatus.mutate({ id: selected.collection.id, status, brand: "reborn" })}>{statusLabel(status)}</button>)}</div>
      {selected.job ? <CoreJobRecordsPanel jobId={selected.job.id} brand="reborn" workspace="Reborn" /> : null}
      <section className="collection-invite"><div><p className="ops-kicker">CUSTOMER PORTAL / AUTOMATIC DELIVERY</p><h3>One send. One password. The client sees their route.</h3><p>Reborn sends a secure activation link; the client sets a password once, then signs in from the shared access page.</p></div><label>Client work email<input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="client@company.com" type="email" /></label><label>Access<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "admin" | "viewer")}><option value="viewer">Read-only viewer</option><option value="admin">Organisation admin</option></select></label><button className="button button-lime" disabled={!inviteEmail || createInvitation.isPending} onClick={createInvite}>{createInvitation.isPending ? <LoaderCircle className="assessment-spin" size={17} /> : <Mail size={17} />}Send invitation</button>
        {inviteLink ? <div className="invite-ready"><strong>Automatic delivery attempted</strong><code>{inviteLink}</code><button type="button" onClick={copyInvite}><Copy size={15} />Copy secure activation link</button></div> : null}
        <div className="invitation-lifecycle"><div className="invitation-lifecycle-head"><div><p className="ops-kicker">ACCESS CONTROL</p><h4>Issued invitations</h4></div><Clock3 size={20} /></div>{invitations.isLoading ? <p className="attachment-loading"><LoaderCircle className="assessment-spin" size={15} />Loading invitations</p> : invitations.data?.length ? invitations.data.map((invitation) => <article key={invitation.id}><div><span className={`invite-status is-${invitation.status}`}>{invitationLabel(invitation.status)}</span><strong>{invitation.email}</strong><small>Expires {new Date(invitation.expiresAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {invitation.lastEmailState === "sent" ? "Email sent" : invitation.lastEmailState === "failed" ? "Email delivery failed" : "Not sent"}{invitation.resendCount ? ` · Resent ${invitation.resendCount}×` : ""}</small></div><div className="invitation-actions"><button type="button" disabled={resendInvitation.isPending || invitation.status === "revoked" || invitation.status === "expired"} onClick={() => resendInvitation.mutate({ invitationId: invitation.id, brand: "reborn" })}><RefreshCw size={15} />Resend</button><button type="button" className="invite-revoke" disabled={revokeInvitation.isPending || invitation.status === "revoked" || invitation.status === "expired"} onClick={() => revokeInvitation.mutate({ invitationId: invitation.id, brand: "reborn" })}><Ban size={15} />Revoke</button></div></article>) : <p className="attachment-empty">No invitation has been issued for this organisation yet.</p>}</div>
      </section>
      {selected.collection.customerNote ? <p className="collection-visible-note"><Check size={16} />Customer sees: {selected.collection.customerNote}</p> : null}
      <section className="collection-attachments"><div className="collection-attachments-head"><div><p className="ops-kicker">ROUTE DOCUMENTS</p><h3>Inventories & evidence</h3><p>Only customer-visible files appear in the portal.</p></div><Paperclip size={27} /></div><div className="attachment-upload-row"><label>File<input type="file" accept=".pdf,.csv,.xls,.xlsx,.docx,.jpg,.jpeg,.png" onChange={chooseAttachment} /><span>{attachmentFile ? attachmentFile.name : "Choose PDF, spreadsheet, Word or image (max. 10 MB)"}</span></label><label>Record type<select value={attachmentType} onChange={(event) => setAttachmentType(event.target.value as "inventory" | "evidence")}><option value="inventory">Asset inventory</option><option value="evidence">Evidence file</option></select></label><label className="attachment-visible"><input type="checkbox" checked={customerVisible} onChange={(event) => setCustomerVisible(event.target.checked)} />Visible to customer</label><button className="button button-dark" disabled={!attachmentFile || uploadAttachment.isPending} onClick={submitAttachment}>{uploadAttachment.isPending ? <LoaderCircle className="assessment-spin" size={17} /> : <Upload size={17} />}Save file</button></div>{attachments.isLoading ? <div className="attachment-loading"><LoaderCircle className="assessment-spin" size={17} />Loading route documents</div> : attachments.data?.length ? <div className="attachment-list">{attachments.data.map((attachment) => <article key={attachment.id}><FileText size={20} /><div><span>{attachmentLabel(attachment.attachmentType)} {attachment.customerVisible ? "· Customer visible" : "· Internal only"}</span><strong>{attachment.fileName}</strong><small>{formatBytes(attachment.sizeBytes)} · {new Date(attachment.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</small></div><button onClick={() => downloadAttachment.mutate({ attachmentId: attachment.id })}><Download size={17} /></button><button className="attachment-delete" onClick={() => deleteAttachment.mutate({ attachmentId: attachment.id })}><Trash2 size={17} /></button></article>)}</div> : <p className="attachment-empty">No inventory or evidence files are attached to this route yet.</p>}</section>
      <CollectionAuditTimeline events={audit.data?.events} loading={audit.isLoading} page={auditPage} pageSize={6} total={audit.data?.total ?? 0} onPageChange={setAuditPage} />
    </section> : null}
  </div></DashboardLayout>;
}
