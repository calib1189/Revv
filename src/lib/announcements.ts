/** One-time announcements, shown once per account when the app opens
 * (0122). A new id shows to everyone again; reusing one never does. */
export const INVITE_ANNOUNCEMENT = "invites_2026_11";

const DAY = 24 * 60 * 60 * 1000;

/** A brand-new account has just had the welcome screen and the tour, so
 * the invite promo waits for their next day. */
export function isAnnouncementAgeReady(profileCreatedAt: string, now: number): boolean {
  return now - new Date(profileCreatedAt).getTime() >= DAY;
}

/** Screens the promo never covers: signing in, the legal pages, and the
 * invite screens themselves. */
const BLOCKED_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/legal",
  "/welcome",
  "/invite",
  "/join",
];

export function isAnnouncementBlockedPath(pathname: string): boolean {
  return BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
