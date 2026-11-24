import { STREAK_POINTS } from "@/lib/points/values";
import type { Streak } from "@/lib/daily/streak";

/*
 * The streak's reward track. Days one to six of each week of a run pay
 * a little more as they go (STREAK_POINTS.track), and the seventh is the
 * chest: a draw of points or a cosmetic that can't be bought
 * (lib/streak/chest.ts). Day eight starts the track over at day one, so
 * every week of a run ends on a chest.
 *
 * A day of the streak is any Sorza day you took part in the Daily or
 * voted in the Build Battle (lib/daily/streak-days.ts). Where you are on
 * the track is worked out from the run, never stored.
 */

export const TRACK_LENGTH = STREAK_POINTS.track.length + 1;

/** Which day of the track (1–7) a run of `current` days is on; 0 for no
 * run. */
export function trackDay(current: number): number {
  if (current <= 0) return 0;
  return ((current - 1) % TRACK_LENGTH) + 1;
}

export interface StreakDayReward {
  /** 1–7 on the track. */
  day: number;
  /** Points for days 1–6; 0 on the chest day, whose prize is drawn. */
  points: number;
  /** The seventh day: the chest. */
  chest: boolean;
}

/** What the day that brought a run to `current` days pays. */
export function streakDayReward(current: number): StreakDayReward | null {
  const day = trackDay(current);
  if (day === 0) return null;
  if (day === TRACK_LENGTH) return { day, points: 0, chest: true };
  return { day, points: STREAK_POINTS.track[day - 1], chest: false };
}

export type TrackSlotState = "done" | "today" | "upcoming";

export interface TrackSlot {
  /** 1–7 within the week. */
  day: number;
  /** The streak day this slot is: 8–14 in the second week, and so on, so
   * the count visibly keeps going and every chest is day 7, 14, 21… */
  streakDay: number;
  /** Null for the chest, whose prize is a draw. */
  points: number | null;
  state: TrackSlotState;
  /** Paid today (the slot today's activity filled). */
  claimedToday: boolean;
}

/** The seven slots as the viewer should see them now. With today done,
 * today's slot is filled and marked claimed. With today still to do,
 * the next slot is "today": play to fill it. A finished week, with today
 * not yet played, rolls over to a fresh track. */
export function trackSlots(streak: Pick<Streak, "current" | "activeToday">): TrackSlot[] {
  const day = trackDay(streak.current);
  const done = streak.activeToday ? day : day === TRACK_LENGTH ? 0 : day;
  // The streak day the week shown starts on.
  const firstDay = Math.max(0, streak.current) - done + 1;
  return Array.from({ length: TRACK_LENGTH }, (_, i) => {
    const slot = i + 1;
    const state: TrackSlotState =
      slot <= done ? "done" : !streak.activeToday && slot === done + 1 ? "today" : "upcoming";
    return {
      day: slot,
      streakDay: firstDay + i,
      points: slot === TRACK_LENGTH ? null : STREAK_POINTS.track[i],
      state,
      claimedToday: streak.activeToday && slot === done,
    };
  });
}
