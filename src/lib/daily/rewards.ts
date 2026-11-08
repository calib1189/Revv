import { DAILY_POINTS } from "@/lib/points/values";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  awardDailyPoints,
  listDailyActivity,
  recordDailyActivityRow,
  STREAK_KINDS,
  type DailyActivityKind,
} from "@/lib/db/daily-activity";
import { computeStreak } from "@/lib/daily/streak";
import type { Placement } from "@/lib/daily/placements";

const KIND_POINTS: Partial<Record<DailyActivityKind, number>> = {
  entered: DAILY_POINTS.entered,
  voted: DAILY_POINTS.voted,
  rated_rides: DAILY_POINTS.ratedRides,
};

/** Records a day's participation and pays its points, once per kind per
 * day, then pays a streak bonus if this day reached a milestone.
 * Best-effort: a reward failing never fails the vote or entry itself. */
export async function rewardDailyActivity(userId: string, dateKey: string, kind: DailyActivityKind): Promise<void> {
  try {
    await recordDailyActivityRow(userId, dateKey, kind);
    const amount = KIND_POINTS[kind];
    if (amount) await awardDailyPoints(userId, `${kind}:${dateKey}`, amount);

    if (STREAK_KINDS.includes(kind)) {
      const rows = await listDailyActivity(createServiceRoleClient(), userId);
      const streak = computeStreak(
        rows.filter((r) => STREAK_KINDS.includes(r.kind)).map((r) => r.activity_date),
        dateKey,
      );
      const bonus = DAILY_POINTS.streak[streak.current];
      if (bonus) await awardDailyPoints(userId, `streak${streak.current}:${dateKey}`, bonus);
    }
  } catch (err) {
    console.error("rewardDailyActivity failed:", err);
  }
}

/** Pays the podium of a settled challenge. Idempotent per challenge date. */
export async function rewardPlacements(dateKey: string, placements: Placement[]): Promise<void> {
  for (const p of placements) {
    try {
      await recordDailyActivityRow(p.userId, dateKey, "placed");
      await awardDailyPoints(p.userId, `place:${dateKey}`, DAILY_POINTS.place[p.place] ?? 0);
    } catch (err) {
      console.error("rewardPlacements failed:", err);
    }
  }
}
