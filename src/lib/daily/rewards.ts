import { DAILY_POINTS } from "@/lib/points/values";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  awardDailyPoints,
  recordDailyActivityRow,
  STREAK_KINDS,
  type DailyActivityKind,
} from "@/lib/db/daily-activity";
import { listStreakDays, streakFrom } from "@/lib/daily/streak-days";
import { streakDayReward } from "@/lib/streak/track";
import { drawChest, FALLBACK_CHEST_POINTS, secureRandom, type ChestPrize } from "@/lib/streak/chest";
import { hasAnyStreakChest, insertStreakChest } from "@/lib/db/streak-chests";
import { listOwnedItemIds } from "@/lib/db/points";
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

    if (STREAK_KINDS.includes(kind)) await rewardStreakDay(userId, dateKey);
  } catch (err) {
    console.error("rewardDailyActivity failed:", err);
  }
}

/** Pays today's place on the streak's reward track (lib/streak/track.ts)
 * after someone shows up: called once their Daily activity or battle
 * vote is recorded. Every payout is keyed to the Sorza day, so showing
 * up twice in a day (the Daily and the battle) pays the track once. A
 * chest day (every seventh of a run) draws the chest instead.
 * Best-effort, like the rest: never fails the vote or entry. */
export async function rewardStreakDay(userId: string, dateKey: string): Promise<void> {
  try {
    const service = createServiceRoleClient();
    const streak = streakFrom(await listStreakDays(service, userId), dateKey);
    if (!streak.activeToday) return;
    const reward = streakDayReward(streak.current);
    if (!reward) return;
    if (reward.chest) await drawStreakChest(userId, dateKey);
    else await awardDailyPoints(userId, `streakday:${dateKey}`, reward.points);
  } catch (err) {
    console.error("rewardStreakDay failed:", err);
  }
}

/** Draws a chest once (lib/streak/chest.ts), records the draw, and pays
 * it: points to the ledger, a cosmetic to the owner's items. The record
 * goes first, so two rewards racing for the same day pay only the one
 * whose draw was kept. Before its table exists (0132) the chest pays a
 * flat amount of points instead. */
async function drawStreakChest(userId: string, dateKey: string): Promise<void> {
  const service = createServiceRoleClient();
  let prize: ChestPrize;
  try {
    const [owned, hadOne] = await Promise.all([listOwnedItemIds(service, userId), hasAnyStreakChest(service, userId)]);
    prize = drawChest(secureRandom(), secureRandom(), { firstChest: !hadOne, owned });
    if (!(await insertStreakChest(service, userId, dateKey, prize))) return;
  } catch (err) {
    console.error("streak chest draw failed, paying the flat amount:", err);
    await awardDailyPoints(userId, `chest:${dateKey}`, FALLBACK_CHEST_POINTS);
    return;
  }
  if (prize.points > 0) await awardDailyPoints(userId, `chest:${dateKey}`, prize.points);
  if (prize.itemId) {
    const { error } = await service
      .from("store_items_owned")
      .upsert({ user_id: userId, item_id: prize.itemId }, { onConflict: "user_id,item_id", ignoreDuplicates: true });
    if (error) throw error;
  }
}

/** Pays the podium of a settled challenge. Idempotent per challenge date.
 * First place pays the day's own amount when an admin set one (0128). */
export async function rewardPlacements(
  dateKey: string,
  placements: Placement[],
  firstPlacePoints: number = DAILY_POINTS.place[1],
): Promise<void> {
  for (const p of placements) {
    try {
      await recordDailyActivityRow(p.userId, dateKey, "placed");
      const amount = p.place === 1 ? firstPlacePoints : (DAILY_POINTS.place[p.place] ?? 0);
      await awardDailyPoints(p.userId, `place:${dateKey}`, amount);
    } catch (err) {
      console.error("rewardPlacements failed:", err);
    }
  }
}
