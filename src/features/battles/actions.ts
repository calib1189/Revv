"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createPriority, deletePriority, getBattleById, getPriorityForVehicle, insertBattleVote } from "@/lib/db/battles";
import { awardDailyPoints } from "@/lib/db/daily-activity";
import { getVehicleById } from "@/lib/db/vehicles";
import { getActiveBuild } from "@/lib/db/builds";
import { getPointsBalance } from "@/lib/db/points";
import { BATTLE_POINTS } from "@/lib/points/values";
import { canBattle, SKIP_LINE, skipLineState } from "@/lib/battles/skip-line";

export interface BattleVoteResult {
  error: string | null;
  /** Points paid for voting (0 if it had already been paid today). */
  points: number;
}

/** One vote in a battle. The database decides who may vote (0131): the
 * battle must be open, the car must be in it, and it can't be your own
 * battle. Voting pays like voting in the Daily, once a day. */
export async function voteInBattleAction(battleId: string, vehicleId: string): Promise<BattleVoteResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to vote.", points: 0 };

  const supabase = await createClient();
  const battle = await getBattleById(supabase, battleId).catch(() => null);
  if (!battle) return { error: "That battle isn't available.", points: 0 };
  if (vehicleId !== battle.vehicle_a_id && vehicleId !== battle.vehicle_b_id) {
    return { error: "That car isn't in this battle.", points: 0 };
  }
  if (Date.parse(battle.ends_at) <= Date.now()) return { error: "Voting has closed on this battle.", points: 0 };

  try {
    await insertBattleVote(supabase, { battleId, voterId: user.id, vehicleId });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "23505") return { error: "You've already voted in this battle.", points: 0 };
    if (code === "42501") return { error: "You can't vote in this battle.", points: 0 };
    console.error("battle vote failed:", err);
    return { error: "Your vote didn't go through. Try again.", points: 0 };
  }

  try {
    await awardDailyPoints(user.id, `battle_vote:${battle.battle_date}`, BATTLE_POINTS.voted);
  } catch (err) {
    console.error("battle vote points failed:", err);
    return { error: null, points: 0 };
  }
  return { error: null, points: BATTLE_POINTS.voted };
}

export interface SkipLineResult {
  error: string | null;
}

/** Spends points so this car leads the next battle (lib/battles/skip-line).
 * Checks everything again here: the owner, that the car can battle, the
 * weekly limit and the balance. The spot is recorded before the charge,
 * and removed if the charge fails, so it's never paid for twice or got
 * for free. */
export async function skipBattleLineAction(vehicleId: string): Promise<SkipLineResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };

  const supabase = await createClient();
  const service = createServiceRoleClient();
  const vehicle = await getVehicleById(supabase, vehicleId);
  if (!vehicle || vehicle.owner_id !== user.id) return { error: "That isn't your car." };

  const [build, priority, balance] = await Promise.all([
    getActiveBuild(supabase, vehicleId),
    getPriorityForVehicle(service, vehicleId),
    getPointsBalance(supabase, user.id),
  ]);
  const state = skipLineState({
    eligible: canBattle(vehicle, build?.ai_rating_score ?? null),
    openRequestAt: priority.open?.created_at ?? null,
    lastRequestAt: priority.lastAt,
    balance,
    now: new Date(),
  });
  if (state.kind === "ineligible") return { error: "Your car needs a score, a cover photo and approval to battle." };
  if (state.kind === "queued") return { error: "Your car is already in line." };
  if (state.kind === "cooldown") return { error: "You can skip the line once a week per car." };
  if (!state.canAfford) return { error: `You need ${SKIP_LINE.price} points. You have ${balance}.` };

  let spot;
  try {
    spot = await createPriority(service, { vehicleId, userId: user.id, points: SKIP_LINE.price });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return { error: "Your car is already in line." };
    console.error("skip line spot failed:", err);
    return { error: "That didn't go through. Try again." };
  }
  const { error: chargeError } = await service.from("points_ledger").insert({
    user_id: user.id,
    amount: -SKIP_LINE.price,
    source_type: "battle_priority",
    source_id: spot.id,
  });
  if (chargeError) {
    console.error("skip line charge failed:", chargeError);
    await deletePriority(service, spot.id).catch(() => {});
    return { error: "That didn't go through, and you weren't charged. Try again." };
  }

  revalidatePath(`/garage/${vehicleId}`);
  revalidatePath("/store");
  return { error: null };
}
