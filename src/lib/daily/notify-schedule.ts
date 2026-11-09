import { DAILY_TIME_ZONE } from "@/lib/daily/day";

/** The Sorza Daily push rules, kept pure so they're tested on their own.
 * The hourly job (api/cron/daily) asks this, per person, what — if
 * anything — they should get right now.
 *
 * At most one morning push and one evening push a day, never during the
 * person's quiet hours, and never for something they've already done.
 * Vote alerts are separate: at most three a day, three hours apart. */

export interface PushPrefs {
  dailyChallenge: boolean;
  dailyResults: boolean;
  dailyVotes: boolean;
  rateRide: boolean;
  quietHours: boolean;
  /** Local hour quiet hours start (0-23). */
  quietStart: number;
  /** Local hour quiet hours end (0-23). */
  quietEnd: number;
}

export interface DayState {
  /** Entered or voted in yesterday's challenge. */
  participatedYesterday: boolean;
  /** Their best place yesterday, if they placed. */
  placeYesterday: number | null;
  /** Whether yesterday's challenge produced a winner at all (no votes
   * means no podium, and nothing to announce). */
  yesterdayHadWinner: boolean;
  enteredToday: boolean;
  ratedRidesToday: boolean;
  /** Whether Rate the Ride has any cars for them today. */
  ridesAvailable: boolean;
  /** Minutes until today's challenge closes. */
  minutesLeft: number;
}

export type ScheduledKind = "morning" | "evening";
export type DailyPushCategory = "daily_challenge" | "daily_results" | "daily_votes" | "rate_ride";

export interface ScheduledPush {
  kind: ScheduledKind;
  category: DailyPushCategory;
  variant: "live" | "results" | "placed" | "reminder" | "rides";
}

const MORNING_HOUR = 9;
const MORNING_LAST_HOUR = 12;
const EVENING_HOUR = 19;
const EVENING_LAST_HOUR = 22;
/** Don't remind someone about a challenge that's about to close anyway. */
const MIN_MINUTES_LEFT_FOR_REMINDER = 45;

export function isQuietHour(hour: number, prefs: Pick<PushPrefs, "quietHours" | "quietStart" | "quietEnd">): boolean {
  if (!prefs.quietHours || prefs.quietStart === prefs.quietEnd) return false;
  return prefs.quietStart < prefs.quietEnd
    ? hour >= prefs.quietStart && hour < prefs.quietEnd
    : hour >= prefs.quietStart || hour < prefs.quietEnd;
}

/** The local hour (0-23) for a person, from their saved time zone. People
 * whose zone we don't know yet are treated as Central, Sorza's home zone. */
export function localHourIn(timeZone: string | null, now: Date = new Date()): number {
  const zone = timeZone || DAILY_TIME_ZONE;
  try {
    return Number(new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", hour: "2-digit" }).format(now));
  } catch {
    return Number(
      new Intl.DateTimeFormat("en-US", { timeZone: DAILY_TIME_ZONE, hourCycle: "h23", hour: "2-digit" }).format(now),
    );
  }
}

export function decideScheduledPush({
  localHour,
  prefs,
  sent,
  state,
}: {
  localHour: number;
  prefs: PushPrefs;
  /** Which scheduled pushes they've already had today. */
  sent: Set<ScheduledKind>;
  state: DayState;
}): ScheduledPush | null {
  if (isQuietHour(localHour, prefs)) return null;

  const morningStart = prefs.quietHours && prefs.quietEnd > MORNING_HOUR && prefs.quietEnd <= MORNING_LAST_HOUR
    ? prefs.quietEnd
    : MORNING_HOUR;
  if (!sent.has("morning") && localHour >= morningStart && localHour <= MORNING_LAST_HOUR) {
    if (state.participatedYesterday && prefs.dailyResults && (state.placeYesterday || state.yesterdayHadWinner)) {
      return { kind: "morning", category: "daily_results", variant: state.placeYesterday ? "placed" : "results" };
    }
    if (prefs.dailyChallenge && !state.enteredToday) {
      return { kind: "morning", category: "daily_challenge", variant: "live" };
    }
    return null;
  }

  if (!sent.has("evening") && localHour >= EVENING_HOUR && localHour <= EVENING_LAST_HOUR) {
    if (state.minutesLeft < MIN_MINUTES_LEFT_FOR_REMINDER) return null;
    if (!state.enteredToday) {
      return prefs.dailyChallenge ? { kind: "evening", category: "daily_challenge", variant: "reminder" } : null;
    }
    if (prefs.rateRide && state.ridesAvailable && !state.ratedRidesToday) {
      return { kind: "evening", category: "rate_ride", variant: "rides" };
    }
  }
  return null;
}

const VOTE_ALERT_GAP_MS = 3 * 60 * 60 * 1000;
export const MAX_VOTE_ALERTS_PER_DAY = 3;

export function mayNotifyVote({
  prefs,
  localHour,
  sentTodayAt,
  now,
}: {
  prefs: PushPrefs;
  localHour: number;
  sentTodayAt: Date[];
  now: Date;
}): boolean {
  if (!prefs.dailyVotes || isQuietHour(localHour, prefs)) return false;
  if (sentTodayAt.length >= MAX_VOTE_ALERTS_PER_DAY) return false;
  return sentTodayAt.every((t) => now.getTime() - t.getTime() >= VOTE_ALERT_GAP_MS);
}
