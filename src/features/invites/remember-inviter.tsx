"use client";

import { useEffect } from "react";
import { INVITE_COOKIE, INVITE_COOKIE_MAX_AGE } from "@/lib/invites/tiers";

/** Remembers whose invite link this was, so the welcome screen can credit
 * them after signup, by email, Google or Apple. */
export function RememberInviter({ username }: { username: string }) {
  useEffect(() => {
    document.cookie = `${INVITE_COOKIE}=${encodeURIComponent(username)}; max-age=${INVITE_COOKIE_MAX_AGE}; path=/; samesite=lax`;
  }, [username]);
  return null;
}
