import type { PushPayload } from "@/lib/push/payload";

/*
 * A one-off nudge to get people posting again (Nov 2026): the first
 * photo or video someone posts in the window earns points. Paid once
 * per person by the ledger's own unique (user, source type, source id),
 * as an admin grant under this offer's id, so no migration was needed.
 *
 * Second run: 200 points, from Monday evening Nov 23 through 11:59pm ET
 * Tuesday Nov 24, announced by email and push. Its own id, so anyone
 * paid by the first run (50 points, weekend of Nov 21, id
 * post_bonus_2026_11_22) can earn this one too. Nothing is paid or
 * pushed outside the window.
 */
export const POST_BONUS = {
  /** The ledger source id, so one payment per person, ever. */
  id: "post_bonus_2026_11_24",
  points: 200,
  /** 6pm CT Monday Nov 23, about when the email goes out. */
  startsAt: "2026-11-24T00:00:00Z",
  endsAt: "2026-11-25T04:59:59Z",
  /** The daily_push_log key for its one push per person, under the
   * "drop" kind (promo pushes) in a slot of its own, clear of the tee
   * drop's (its end date, slot 0). */
  pushLogDay: "2026-11-24",
  pushLogSlot: 1,
} as const;

/** Whether a post made at `at` earns the bonus. */
export function isPostBonusLive(at: Date): boolean {
  const t = at.getTime();
  return t >= Date.parse(POST_BONUS.startsAt) && t <= Date.parse(POST_BONUS.endsAt);
}

/** The push stops going out 3 hours before the end, so nobody opens it
 * to an offer that's already over. */
const PUSH_CUTOFF_MS = 3 * 60 * 60 * 1000;

export function isPostBonusPushDue(now: Date): boolean {
  return isPostBonusLive(now) && Date.parse(POST_BONUS.endsAt) - now.getTime() > PUSH_CUTOFF_MS;
}

/** Waking hours on someone's own clock, for a push that shouldn't wait
 * for the afternoon window: 10am through 9pm. Quiet hours still win. */
export function isPromoPushHour(localHour: number): boolean {
  return localHour >= 10 && localHour <= 21;
}

export function postBonusPushPayload(): PushPayload {
  return {
    title: `${POST_BONUS.points} points for one post`,
    body: `Post a photo or video of your car before Tuesday night and we'll drop ${POST_BONUS.points} points in your account.`,
    url: "/feed/new",
  };
}
