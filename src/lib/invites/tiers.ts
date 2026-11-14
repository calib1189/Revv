/** The invite ladder. Each rung is also an achievement (lib/achievements
 * /catalog.ts), so reaching one shows on the inviter's profile like any
 * other badge, and pays points when they claim it. */
export interface InviteTier {
  count: number;
  achievementId: string;
  name: string;
  reward: string;
}

export const INVITE_TIERS: InviteTier[] = [
  { count: 3, achievementId: "invites_3", name: "Early Supporter", reward: "Early Supporter badge on your profile" },
  { count: 5, achievementId: "invites_5", name: "Featured Builder", reward: "A shot at being featured by SORZA" },
  { count: 10, achievementId: "invites_10", name: "SORZA OG", reward: "OG status on your profile" },
  { count: 25, achievementId: "invites_25", name: "Founding Circle", reward: "Recognized as part of SORZA's founding community" },
];

/** The admin Invites page flags everyone at or past this rung as due a
 * feature. */
export const FEATURE_INVITES = 5;

/** How long a new account has to say who invited them. Matches the RLS
 * check on referrals (0121). */
export const INVITE_WINDOW_DAYS = 7;

/** Remembers whose invite link someone opened, until they sign up. */
export const INVITE_COOKIE = "sorza_invite";
export const INVITE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

/** An invite counts once the person has added a car: a signup that never
 * does anything doesn't move anyone up the ladder. */
export function countedInvites(invites: { hasCar: boolean }[]): number {
  return invites.filter((i) => i.hasCar).length;
}

export function inviteProgress(count: number): {
  reached: InviteTier[];
  next: InviteTier | null;
  toNext: number;
} {
  const reached = INVITE_TIERS.filter((t) => count >= t.count);
  const next = INVITE_TIERS.find((t) => count < t.count) ?? null;
  return { reached, next, toNext: next ? next.count - count : 0 };
}

/** Whether an account is still new enough to name who invited it. */
export function canNameInviter(profileCreatedAt: string, now: number): boolean {
  return now - new Date(profileCreatedAt).getTime() < INVITE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/** What someone typed as their inviter, as a username to look up:
 * "@Turbo_Dan " and a pasted invite link both become "turbo_dan". */
export function parseInviterInput(input: string): string | null {
  let value = input.trim();
  const fromLink = value.match(/\/join\/([^/?#\s]+)/i);
  if (fromLink) value = decodeURIComponent(fromLink[1]);
  value = value.replace(/^@+/, "").toLowerCase();
  return /^[a-z0-9_]{3,24}$/.test(value) ? value : null;
}

export function invitePath(username: string): string {
  return `/join/${encodeURIComponent(username)}`;
}

export interface InviteLeader {
  referrerId: string;
  /** Everyone who signed up with their invite. */
  total: number;
  /** Of those, the ones who added a car. */
  counted: number;
  lastInviteAt: string;
}

/** Inviters ranked by invites that count, then by signups, for Admin →
 * Invites. `referrals` is newest first. */
export function inviteLeaders(
  referrals: { referrer_id: string; invitee_id: string; created_at: string }[],
  withCars: Set<string>,
): InviteLeader[] {
  const byReferrer = new Map<string, InviteLeader>();
  for (const r of referrals) {
    const leader = byReferrer.get(r.referrer_id) ?? {
      referrerId: r.referrer_id,
      total: 0,
      counted: 0,
      lastInviteAt: r.created_at,
    };
    leader.total += 1;
    if (withCars.has(r.invitee_id)) leader.counted += 1;
    if (r.created_at > leader.lastInviteAt) leader.lastInviteAt = r.created_at;
    byReferrer.set(r.referrer_id, leader);
  }
  return [...byReferrer.values()].sort(
    (a, b) => b.counted - a.counted || b.total - a.total || (a.lastInviteAt < b.lastInviteAt ? 1 : -1),
  );
}
