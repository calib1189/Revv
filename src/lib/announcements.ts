/** One-time announcements, shown once per account when the app opens
 * (0122). A new id shows to everyone again; reusing one never does. */
// A new id when the program changes: points per invite (0125) shows again
// to members who saw the badge-only version.
export const INVITE_ANNOUNCEMENT = "invites_points_2026_11";

/** A prize day's takeover (more points than usual for the Daily winner):
 * once per account per day. */
export function dailyBoostAnnouncement(dateKey: string): string {
  return `daily_boost_${dateKey}`;
}

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
