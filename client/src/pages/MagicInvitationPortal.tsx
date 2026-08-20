import { useEffect } from "react";
import { useLocation } from "wouter";

/** Compatibility handoff: invitations now activate a password-gated client account. */
export function MagicInvitationPortal({ token }: { token: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(`/login?invite=${encodeURIComponent(token)}`); }, [setLocation, token]);
  return null;
}
