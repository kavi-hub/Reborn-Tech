import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import "@/access-login.css";

export default function AccessLogin() {
  const [location, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(window.location.search), [location]);
  const invitationToken = params.get("invite");
  const [mode, setMode] = useState<"client" | "team">(params.get("access") === "team" ? "team" : "client");
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [activation, setActivation] = useState({ password: "", confirm: "" });
  const { user, loading: staffLoading } = useAuth();
  const client = trpc.clientAuth.me.useQuery();
  const invitation = trpc.clientAuth.invitation.useQuery({ token: invitationToken || "" }, { enabled: Boolean(invitationToken), retry: false });
  const clientLogin = trpc.clientAuth.login.useMutation({ onSuccess: () => setLocation("/portal"), onError: (error) => toast("Client sign-in failed", { description: error.message }) });
  const activate = trpc.clientAuth.activate.useMutation({ onSuccess: () => { toast("Client access activated", { description: "Your password is set and your dashboard is ready." }); setLocation("/portal"); }, onError: (error) => toast("Activation could not be completed", { description: error.message }) });

  useEffect(() => { if (!staffLoading && user && mode === "team") setLocation("/operations"); }, [mode, setLocation, staffLoading, user]);
  useEffect(() => { if (client.data) setLocation("/portal"); }, [client.data, setLocation]);

  const submitClient = () => clientLogin.mutate({ email: credentials.email, password: credentials.password });
  const submitActivation = () => {
    if (!invitationToken) return;
    if (activation.password !== activation.confirm) { toast("Passwords do not match", { description: "Enter the same password in both fields." }); return; }
    activate.mutate({ token: invitationToken, password: activation.password });
  };

  const activationView = invitationToken ? <section className="access-card"><p className="ops-kicker">CLIENT ACCESS ACTIVATION</p><h1>Set your portal password.</h1><p>{invitation.isLoading ? "Checking your secure invitation…" : invitation.data ? `This invitation prepares ${invitation.data.email} for a password-gated ${invitation.data.brand === "bulk_gsm" ? "Bulk GSM" : "Reborn"} dashboard.` : "This invitation is no longer available. Ask your Reborn contact to resend access."}</p>{invitation.data ? <div className="access-form"><label>New password<input type="password" autoComplete="new-password" value={activation.password} onChange={(event) => setActivation({ ...activation, password: event.target.value })} placeholder="12+ characters, letters and numbers" /></label><label>Confirm password<input type="password" autoComplete="new-password" value={activation.confirm} onChange={(event) => setActivation({ ...activation, confirm: event.target.value })} placeholder="Repeat password" /></label><button className="button button-lime" disabled={activate.isPending || activation.password.length < 12} onClick={submitActivation}>{activate.isPending ? <LoaderCircle className="assessment-spin" size={17} /> : <LockKeyhole size={17} />}Activate client dashboard</button></div> : <a className="access-text-link" href="/login">Return to sign in <ArrowUpRight size={15} /></a>}</section> : <section className="access-card"><p className="ops-kicker">CLIENT PORTAL</p><h1>Sign in to your ITAD dashboard.</h1><p>Use the work email and password established from your Reborn or Bulk GSM client-access invitation.</p><div className="access-form"><label>Work email<input type="email" autoComplete="email" value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} placeholder="you@organisation.com" /></label><label>Password<input type="password" autoComplete="current-password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} placeholder="Your portal password" /></label><button className="button button-dark" disabled={!credentials.email || !credentials.password || clientLogin.isPending} onClick={submitClient}>{clientLogin.isPending ? <LoaderCircle className="assessment-spin" size={17} /> : <KeyRound size={17} />}Open client dashboard</button></div><p className="access-footnote">New client? Use the secure access invitation sent by the Operations team to set your password.</p></section>;

  return <main className="access-shell"><a className="access-brand" href="/"><span>R</span><b>REBORN<em>TECH</em></b></a><section className="access-frame"><aside><p className="ops-kicker">SECURE ITAD ACCESS</p><h2>One entry point.<br /><em>The right workspace.</em></h2><p>Client collection data and staff Operations controls are segregated by authenticated identity.</p><div className="access-proof"><ShieldCheck size={19} /><span>Client access is scoped to the invited organisation and brand.</span></div></aside><div className="access-main"><div className="access-tabs" role="tablist"><button className={mode === "client" ? "is-active" : ""} onClick={() => { setMode("client"); window.history.replaceState(null, "", invitationToken ? `${location.split("?")[0]}?invite=${invitationToken}` : "/login"); }}><UsersRound size={16} />Client</button><button className={mode === "team" ? "is-active" : ""} onClick={() => { setMode("team"); window.history.replaceState(null, "", "/login?access=team"); }}><ShieldCheck size={16} />Team</button></div>{mode === "team" ? <section className="access-card"><p className="ops-kicker">OPERATIONS TEAM</p><h1>Sign in to Operations.</h1><p>Operations access is reserved for authorised staff. Your existing staff account determines whether you can enter the Operations workspace.</p><button className="button button-dark" disabled={staffLoading} onClick={() => startLogin()}>{staffLoading ? <LoaderCircle className="assessment-spin" size={17} /> : <ShieldCheck size={17} />}Continue as staff</button></section> : activationView}</div></section></main>;
}
