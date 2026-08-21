/** Reborn transactional email: one server-side sender and visual language for client access and route updates. */
const sender = "Reborn Tech <reborn@bulkgsm.com>";

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

async function sendEmail(input: { to: string; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Transactional email is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: sender, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
  });
  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok || !payload.id) throw new Error(payload.message || "Transactional email could not be sent");
  return payload.id;
}

const shell = (title: string, body: string) => `<!doctype html><html><body style="margin:0;background:#f1efe7;color:#1f2521;font-family:Arial,sans-serif"><table width="100%" cellspacing="0" cellpadding="0" role="presentation"><tr><td style="padding:36px 18px"><table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="max-width:620px;margin:0 auto;background:#fffdf6;border-top:4px solid #c9f14a"><tr><td style="padding:30px 34px"><p style="margin:0 0 24px;color:#294f42;font-size:11px;font-weight:700;letter-spacing:1.8px">REBORN TECH / SECURE ITAD</p><h1 style="margin:0 0 18px;font-size:31px;line-height:1.05;letter-spacing:-1.5px">${title}</h1>${body}<hr style="margin:32px 0 18px;border:0;border-top:1px solid #d5d5cb"><p style="margin:0;color:#5b625b;font-size:12px;line-height:1.6">Reborn Tech is a Bulk GSM company. Secure ITAD. Second life, verified.</p></td></tr></table></td></tr></table></body></html>`;

export async function sendPortalInvitationEmail(input: { to: string; organisationName: string; portalUrl: string; expiresAt: Date; resend?: boolean }) {
  const organisation = escapeHtml(input.organisationName);
  const url = escapeHtml(input.portalUrl);
  const expires = input.expiresAt.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const heading = input.resend ? "Your client access link has been refreshed." : "Your client dashboard is ready.";
  const html = shell(heading, `<p style="font-size:16px;line-height:1.6">Reborn has prepared secure client access for <strong>${organisation}</strong>. Use the button below to set your portal password, then view your routes, documents and customer-approved milestones.</p><p style="margin:28px 0"><a href="${url}" style="display:inline-block;background:#c9f14a;color:#182019;padding:14px 18px;text-decoration:none;font-weight:700">Set portal password →</a></p><p style="font-size:13px;line-height:1.6;color:#586058">This private activation link is available until ${escapeHtml(expires)}. Please keep it confidential and contact Reborn if it was sent to you in error.</p>`);
  return sendEmail({ to: input.to, subject: input.resend ? "Your refreshed Reborn Tech client access link" : "Set your Reborn Tech client portal password", html, text: `Reborn has prepared password-gated client access for ${input.organisationName}. Set your portal password here: ${input.portalUrl}. This link is available until ${expires}.` });
}

export async function sendClientPasswordResetEmail(input: { to: string; resetUrl: string; expiresAt: Date }) {
  const url = escapeHtml(input.resetUrl);
  const expires = input.expiresAt.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const html = shell("Reset your client portal password.", `<p style="font-size:16px;line-height:1.6">A password reset was requested for your Reborn Tech client dashboard. Use the button below to choose a new password.</p><p style="margin:28px 0"><a href="${url}" style="display:inline-block;background:#c9f14a;color:#182019;padding:14px 18px;text-decoration:none;font-weight:700">Reset portal password →</a></p><p style="font-size:13px;line-height:1.6;color:#586058">This reset link expires at ${escapeHtml(expires)}. If you did not request it, you can ignore this email.</p>`);
  return sendEmail({ to: input.to, subject: "Reset your Reborn Tech client portal password", html, text: `A password reset was requested for your Reborn Tech client dashboard. Reset your password here: ${input.resetUrl}. This link expires at ${expires}. If you did not request it, you can ignore this email.` });
}

export async function sendCollectionStatusEmail(input: { to: string; organisationName: string; collectionReference: string; collectionTitle: string; statusLabel: string; portalUrl: string }) {
  const html = shell("Your collection route has moved forward.", `<p style="font-size:16px;line-height:1.6"><strong>${escapeHtml(input.collectionReference)}</strong> — ${escapeHtml(input.collectionTitle)} is now marked <strong>${escapeHtml(input.statusLabel)}</strong>.</p><p style="margin:28px 0"><a href="${escapeHtml(input.portalUrl)}" style="display:inline-block;background:#c9f14a;color:#182019;padding:14px 18px;text-decoration:none;font-weight:700">Open client dashboard →</a></p><p style="font-size:13px;line-height:1.6;color:#586058">Sign in with your portal password to see the latest customer-visible milestones and released route documents.</p>`);
  return sendEmail({ to: input.to, subject: `Collection update: ${input.collectionReference} is now ${input.statusLabel}`, html, text: `${input.collectionReference} — ${input.collectionTitle} is now ${input.statusLabel}. Sign in to your client dashboard: ${input.portalUrl}` });
}

export async function sendCollectionBookedEmail(input: { to: string; organisationName: string; collectionReference: string; collectionTitle: string; scheduledFor?: Date | null; portalUrl: string }) {
  const date = input.scheduledFor ? input.scheduledFor.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "the agreed collection date";
  const html = shell("Your collection is booked.", `<p style="font-size:16px;line-height:1.6"><strong>${escapeHtml(input.collectionReference)}</strong> — ${escapeHtml(input.collectionTitle)} has been booked for <strong>${escapeHtml(date)}</strong>.</p><p style="margin:28px 0"><a href="${escapeHtml(input.portalUrl)}" style="display:inline-block;background:#c9f14a;color:#182019;padding:14px 18px;text-decoration:none;font-weight:700">Open client dashboard →</a></p><p style="font-size:13px;line-height:1.6;color:#586058">Your dashboard holds the live collection route, customer-approved documents and future milestones.</p>`);
  return sendEmail({ to: input.to, subject: `Collection booked: ${input.collectionReference}`, html, text: `${input.collectionReference} — ${input.collectionTitle} has been booked for ${date}. Open your client dashboard: ${input.portalUrl}` });
}

export async function sendJobCompletedEmail(input: { to: string; organisationName: string; jobReference: string; jobTitle: string; portalUrl: string }) {
  const html = shell("Your ITAD job is complete.", `<p style="font-size:16px;line-height:1.6"><strong>${escapeHtml(input.jobReference)}</strong> — ${escapeHtml(input.jobTitle)} is complete. Your approved Securaze evidence, destruction certificate and impact statement are ready in the client dashboard.</p><p style="margin:28px 0"><a href="${escapeHtml(input.portalUrl)}" style="display:inline-block;background:#c9f14a;color:#182019;padding:14px 18px;text-decoration:none;font-weight:700">View issued documents →</a></p><p style="font-size:13px;line-height:1.6;color:#586058">This notification confirms document release, not any commercial valuation or recovery outcome.</p>`);
  return sendEmail({ to: input.to, subject: `ITAD job complete: ${input.jobReference}`, html, text: `${input.jobReference} — ${input.jobTitle} is complete. Approved Securaze evidence, destruction certificate and impact statement are available in your client dashboard: ${input.portalUrl}` });
}

export async function sendExceptionLifecycleEmail(input: { to: string; recipientName: string; jobReference: string; exceptionTitle: string; event: "assigned" | "resolved"; workspaceLabel: string; operationsUrl: string }) {
  const recipient = escapeHtml(input.recipientName);
  const reference = escapeHtml(input.jobReference);
  const exception = escapeHtml(input.exceptionTitle);
  const action = input.event === "assigned" ? "has been assigned to you" : "has been resolved";
  const html = shell(input.event === "assigned" ? "A Core Job exception needs your attention." : "A Core Job exception has been resolved.", `<p style="font-size:16px;line-height:1.6">Hello ${recipient},</p><p style="font-size:16px;line-height:1.6"><strong>${exception}</strong> on Core Job <strong>${reference}</strong> ${action} in the ${escapeHtml(input.workspaceLabel)} workspace.</p><p style="margin:28px 0"><a href="${escapeHtml(input.operationsUrl)}" style="display:inline-block;background:#c9f14a;color:#182019;padding:14px 18px;text-decoration:none;font-weight:700">Open Core Job operations →</a></p><p style="font-size:13px;line-height:1.6;color:#586058">This is an internal operations notice. Review the Core Job activity ledger for the latest context.</p>`);
  return sendEmail({ to: input.to, subject: input.event === "assigned" ? `Exception assigned: ${input.jobReference}` : `Exception resolved: ${input.jobReference}`, html, text: `Hello ${input.recipientName}. ${input.exceptionTitle} on Core Job ${input.jobReference} ${action} in the ${input.workspaceLabel} workspace. Open operations: ${input.operationsUrl}` });
}
