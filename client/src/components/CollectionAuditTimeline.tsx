/** Material Trace audit timeline: shows immutable route events without exposing internal-only access activity to customers. */
import { Clock3, FileMinus2, FilePlus2, Flag, History, Route } from "lucide-react";

type AuditEvent = {
  id: number;
  eventType: "route_created" | "status_changed" | "customer_access_changed" | "attachment_uploaded" | "attachment_removed";
  summary: string;
  createdAt: Date;
};

type AuditRow = { event: AuditEvent; actor?: { name: string | null; email: string | null } | null };

const iconFor = (type: AuditEvent["eventType"]) => {
  if (type === "route_created") return Route;
  if (type === "attachment_uploaded") return FilePlus2;
  if (type === "attachment_removed") return FileMinus2;
  if (type === "status_changed") return Flag;
  return Clock3;
};

export function CollectionAuditTimeline({ events, loading, customer = false }: { events?: AuditRow[]; loading: boolean; customer?: boolean }) {
  return <section className={`collection-audit ${customer ? "collection-audit-customer" : ""}`}><div className="collection-audit-head"><div><p className="ops-kicker">{customer ? "ROUTE MILESTONES" : "IMMUTABLE ROUTE HISTORY"}</p><h3>{customer ? "What has happened so far" : "Accountable activity"}</h3></div><History size={23} /></div>{loading ? <p className="attachment-loading"><Clock3 size={16} />Loading route history</p> : events?.length ? <ol>{events.map(({ event, actor }) => { const Icon = iconFor(event.eventType); return <li key={event.id}><span className="collection-audit-icon"><Icon size={15} /></span><div><strong>{event.summary}</strong><small>{new Date(event.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}{!customer && actor ? ` · ${actor.name || actor.email || "Reborn operations"}` : ""}</small></div></li>; })}</ol> : <p className="attachment-empty">{customer ? "No customer-visible route milestones have been recorded yet." : "No route activity has been recorded yet."}</p>}</section>;
}
