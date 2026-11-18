"use client";

import { useEffect } from "react";
import { INVITE_COOKIE, INVITE_COOKIE_MAX_AGE } from "@/lib/invites/tiers";

/** Any SORZA link can carry `?ref=username` (shared builds and scores do),
 * so every share works like an invite link: whoever opens it is
 * remembered as invited by that member until they sign up. The welcome
 * screen credits it (features/invites/inviter-section.tsx). */
export function CaptureInviteRef() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref")?.trim().replace(/^@+/, "").toLowerCase();
    if (!ref || !/^[a-z0-9_]{3,24}$/.test(ref)) return;
    document.cookie = `${INVITE_COOKIE}=${encodeURIComponent(ref)}; max-age=${INVITE_COOKIE_MAX_AGE}; path=/; samesite=lax`;
  }, []);
  return null;
}
