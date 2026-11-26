import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  getBattleByDate,
  getBattleById,
  getBattleCounts,
  getBattleVoteTotal,
  getMyBattleVote,
  getPriorityForVehicle,
  listEndedBattlesForVehicle,
  listRecentEndedBattles,
  type Battle,
} from "@/lib/db/battles";
import { listVehiclesByIds } from "@/lib/db/vehicles";
import { getProfilesByIds } from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { getPointsBalance } from "@/lib/db/points";
import { addDays, dailyDateKey } from "@/lib/daily/day";
import { battleOutcome } from "@/lib/battles/result";
import { canBattle, skipLineState, type SkipLineState } from "@/lib/battles/skip-line";

export interface BattleCar {
  vehicleId: string;
  title: string;
  heroUrl: string | null;
  ownerId: string;
  ownerUsername: string;
  ownerIsVerified: boolean;
  /** The car's SORZA score when the battle was set. */
  score: number;
}

export interface BattleView {
  id: string;
  dateKey: string;
  endsAt: string;
  a: BattleCar;
  b: BattleCar;
  ended: boolean;
  /** Votes per side, the winner and whether it was an upset; only once
   * the battle has ended (counts stay hidden until then). */
  result: { a: number; b: number; winnerId: string | null; upset: boolean } | null;
  /** Votes cast so far, shown while it's live. */
  voteTotal: number;
  /** The car the viewer picked, if they voted. */
  myVote: string | null;
  /** The viewer owns one of the two cars, so sits this one out. */
  isOwner: boolean;
  /** Which of the two is the viewer's own car, if either. */
  myCarId: string | null;
}

async function composeCars(
  supabase: SupabaseClient<Database>,
  battle: Battle,
): Promise<{ a: BattleCar; b: BattleCar } | null> {
  const vehicles = await listVehiclesByIds(supabase, [battle.vehicle_a_id, battle.vehicle_b_id]);
  const owners = await getProfilesByIds(supabase, [...new Set(vehicles.map((v) => v.owner_id))]);
  const ownerById = new Map(owners.map((o) => [o.id, o]));
  const media = await getMediaByIds(
    supabase,
    vehicles.map((v) => v.hero_media_id).filter((id): id is string => Boolean(id)),
  );
  const urlById = new Map(media.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));

  const car = (vehicleId: string, score: number): BattleCar | null => {
    const v = vehicles.find((x) => x.id === vehicleId);
    if (!v) return null;
    const owner = ownerById.get(v.owner_id);
    return {
      vehicleId: v.id,
      title: v.nickname || `${v.make} ${v.model}`,
      heroUrl: v.hero_media_id ? (urlById.get(v.hero_media_id) ?? null) : null,
      ownerId: v.owner_id,
      ownerUsername: owner?.username ?? "unknown",
      ownerIsVerified: owner?.is_verified ?? false,
      score: Number(score),
    };
  };
  const a = car(battle.vehicle_a_id, battle.score_a);
  const b = car(battle.vehicle_b_id, battle.score_b);
  return a && b ? { a, b } : null;
}

/** A battle as the UI shows it, for this viewer. */
export async function loadBattleView(
  supabase: SupabaseClient<Database>,
  battle: Battle,
  viewerId: string | null,
): Promise<BattleView | null> {
  const ended = Date.parse(battle.ends_at) <= Date.now();
  const [cars, counts, voteTotal, myVote] = await Promise.all([
    composeCars(supabase, battle),
    ended ? getBattleCounts(supabase, [battle.id]) : Promise.resolve(null),
    getBattleVoteTotal(supabase, battle.id).catch(() => 0),
    viewerId ? getMyBattleVote(supabase, battle.id, viewerId).catch(() => null) : Promise.resolve(null),
  ]);
  if (!cars) return null;

  let result: BattleView["result"] = null;
  if (counts) {
    const perCar = counts.get(battle.id);
    const outcome = battleOutcome(
      { vehicleAId: battle.vehicle_a_id, vehicleBId: battle.vehicle_b_id, scoreA: Number(battle.score_a), scoreB: Number(battle.score_b) },
      { a: perCar?.get(battle.vehicle_a_id) ?? 0, b: perCar?.get(battle.vehicle_b_id) ?? 0 },
    );
    result = { a: outcome.a, b: outcome.b, winnerId: outcome.winnerId, upset: outcome.upset };
  }

  return {
    id: battle.id,
    dateKey: battle.battle_date,
    endsAt: battle.ends_at,
    ...cars,
    ended,
    result,
    voteTotal,
    myVote,
    isOwner: viewerId !== null && (cars.a.ownerId === viewerId || cars.b.ownerId === viewerId),
    myCarId:
      viewerId === null ? null : cars.a.ownerId === viewerId ? cars.a.vehicleId : cars.b.ownerId === viewerId ? cars.b.vehicleId : null,
  };
}

/** Today's battle, or null (none set, or 0131 not applied yet). */
export async function loadTodayBattle(
  supabase: SupabaseClient<Database>,
  viewerId: string | null,
  now: Date = new Date(),
): Promise<BattleView | null> {
  const battle = await getBattleByDate(supabase, dailyDateKey(now)).catch(() => null);
  return battle ? loadBattleView(supabase, battle, viewerId) : null;
}

/** Yesterday's battle with its result, for the winner slide. */
export async function loadYesterdayBattle(
  supabase: SupabaseClient<Database>,
  viewerId: string | null,
  now: Date = new Date(),
): Promise<BattleView | null> {
  const battle = await getBattleByDate(supabase, addDays(dailyDateKey(now), -1)).catch(() => null);
  return battle ? loadBattleView(supabase, battle, viewerId) : null;
}

/** Recent finished battles for the history list, newest first, skipping
 * ones nobody voted in (they have no result to show). */
export async function loadPastBattles(
  supabase: SupabaseClient<Database>,
  viewerId: string | null,
  limit = 10,
): Promise<BattleView[]> {
  const battles = await listRecentEndedBattles(supabase, limit).catch(() => [] as Battle[]);
  const views = await Promise.all(battles.map((b) => loadBattleView(supabase, b, viewerId).catch(() => null)));
  return views.filter((v): v is BattleView => v !== null && v.result !== null && v.result.a + v.result.b > 0);
}

export async function loadBattleViewById(
  supabase: SupabaseClient<Database>,
  battleId: string,
  viewerId: string | null,
): Promise<BattleView | null> {
  const battle = await getBattleById(supabase, battleId).catch(() => null);
  return battle ? loadBattleView(supabase, battle, viewerId) : null;
}

/** A car's battle record, counted from the votes (nothing stored). */
export async function loadBattleRecord(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
): Promise<{ wins: number; losses: number } | null> {
  const battles = await listEndedBattlesForVehicle(supabase, vehicleId).catch(() => null);
  if (!battles || battles.length === 0) return null;
  const counts = await getBattleCounts(
    supabase,
    battles.map((b) => b.id),
  );
  let wins = 0;
  let losses = 0;
  for (const b of battles) {
    const perCar = counts.get(b.id);
    const outcome = battleOutcome(
      { vehicleAId: b.vehicle_a_id, vehicleBId: b.vehicle_b_id, scoreA: Number(b.score_a), scoreB: Number(b.score_b) },
      { a: perCar?.get(b.vehicle_a_id) ?? 0, b: perCar?.get(b.vehicle_b_id) ?? 0 },
    );
    if (outcome.winnerId === vehicleId) wins += 1;
    else if (outcome.loserId === vehicleId) losses += 1;
  }
  return { wins, losses };
}

/** The owner's skip-the-line state for their car page, or null when
 * battles aren't set up yet (0131 not applied). */
export async function loadSkipLineState(
  supabase: SupabaseClient<Database>,
  vehicle: { id: string; ownership_verification_status: string | null; hero_media_id: string | null },
  score: number | null,
  ownerId: string,
): Promise<SkipLineState | null> {
  const [priority, balance] = await Promise.all([
    getPriorityForVehicle(supabase, vehicle.id).catch(() => null),
    getPointsBalance(supabase, ownerId).catch(() => 0),
  ]);
  if (!priority) return null;
  return skipLineState({
    eligible: canBattle(vehicle, score),
    openRequestAt: priority.open?.created_at ?? null,
    lastRequestAt: priority.lastAt,
    balance,
    now: new Date(),
  });
}
