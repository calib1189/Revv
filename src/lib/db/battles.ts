import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Battle = Database["public"]["Tables"]["build_battles"]["Row"];

function untyped(supabase: SupabaseClient<Database>): SupabaseClient {
  return supabase as unknown as SupabaseClient;
}

/** A day's battle, or null if there isn't one (or 0131 hasn't run). */
export async function getBattleByDate(
  supabase: SupabaseClient<Database>,
  dateKey: string,
): Promise<Battle | null> {
  const { data, error } = await supabase.from("build_battles").select("*").eq("battle_date", dateKey).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getBattleById(supabase: SupabaseClient<Database>, battleId: string): Promise<Battle | null> {
  const { data, error } = await supabase.from("build_battles").select("*").eq("id", battleId).maybeSingle();
  if (error) throw error;
  return data;
}

/** Every battle a car has been in that has ended, newest first. */
export async function listEndedBattlesForVehicle(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
): Promise<Battle[]> {
  const { data, error } = await supabase
    .from("build_battles")
    .select("*")
    .or(`vehicle_a_id.eq.${vehicleId},vehicle_b_id.eq.${vehicleId}`)
    .lte("ends_at", new Date().toISOString())
    .order("battle_date", { ascending: false });
  if (error) throw error;
  return data;
}

/** Each car's last battle day, for matchmaking (lib/battles/match). */
export async function listLastBattleDates(supabase: SupabaseClient<Database>): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("build_battles")
    .select("battle_date, vehicle_a_id, vehicle_b_id")
    .order("battle_date", { ascending: true });
  if (error) throw error;
  const last = new Map<string, string>();
  for (const b of data) {
    last.set(b.vehicle_a_id, b.battle_date);
    last.set(b.vehicle_b_id, b.battle_date);
  }
  return last;
}

/** Votes per car, keyed by battle. Only ended battles have counts (0131). */
export async function getBattleCounts(
  supabase: SupabaseClient<Database>,
  battleIds: string[],
): Promise<Map<string, Map<string, number>>> {
  const counts = new Map<string, Map<string, number>>();
  if (battleIds.length === 0) return counts;
  const { data, error } = await untyped(supabase).rpc("build_battle_counts", { p_battle_ids: battleIds });
  if (error) throw error;
  for (const row of (data ?? []) as { battle_id: string; vehicle_id: string; votes: number }[]) {
    const perCar = counts.get(row.battle_id) ?? new Map<string, number>();
    perCar.set(row.vehicle_id, Number(row.votes));
    counts.set(row.battle_id, perCar);
  }
  return counts;
}

/** How many have voted so far; never who's ahead. */
export async function getBattleVoteTotal(supabase: SupabaseClient<Database>, battleId: string): Promise<number> {
  const { data, error } = await untyped(supabase).rpc("build_battle_vote_total", { p_battle_id: battleId });
  if (error) throw error;
  return Number(data ?? 0);
}

/** The car this person picked in a battle, or null. RLS only ever
 * returns their own vote. */
export async function getMyBattleVote(
  supabase: SupabaseClient<Database>,
  battleId: string,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("build_battle_votes")
    .select("vehicle_id")
    .eq("battle_id", battleId)
    .eq("voter_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.vehicle_id ?? null;
}

/** Casts a vote as the signed-in user; RLS checks the battle is open,
 * the car is in it, and it isn't the voter's own battle. */
/** When someone voted in battles, newest first: one vote per battle, and
 * a battle runs one Sorza day, so each is a day they showed up (the
 * streak, lib/daily/streak-days.ts). RLS returns only your own votes. */
export async function listMyBattleVoteTimes(
  supabase: SupabaseClient<Database>,
  voterId: string,
  limit = 400,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("build_battle_votes")
    .select("created_at")
    .eq("voter_id", voterId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map((row) => row.created_at);
}

export async function insertBattleVote(
  supabase: SupabaseClient<Database>,
  vote: { battleId: string; voterId: string; vehicleId: string },
): Promise<void> {
  const { error } = await supabase
    .from("build_battle_votes")
    .insert({ battle_id: vote.battleId, voter_id: vote.voterId, vehicle_id: vote.vehicleId });
  if (error) throw error;
}

// --- Server-only (service role): creating and settling battles. ---

/** Inserts the day's battle unless one exists. True when this call
 * created it, so only one overlapping run sends the owners' alerts. */
export async function createBattle(
  service: SupabaseClient<Database>,
  row: Database["public"]["Tables"]["build_battles"]["Insert"],
): Promise<Battle | null> {
  const { data, error } = await service
    .from("build_battles")
    .upsert(row, { onConflict: "battle_date", ignoreDuplicates: true })
    .select("*");
  if (error) throw error;
  return data[0] ?? null;
}

export async function listUnsettledEndedBattles(service: SupabaseClient<Database>): Promise<Battle[]> {
  const { data, error } = await service
    .from("build_battles")
    .select("*")
    .is("settled_at", null)
    .lte("ends_at", new Date().toISOString())
    .order("battle_date", { ascending: true });
  if (error) throw error;
  return data;
}

/** Marks a battle settled; true only for the run that got there first. */
export async function claimBattleSettlement(service: SupabaseClient<Database>, battleId: string): Promise<boolean> {
  const { data, error } = await service
    .from("build_battles")
    .update({ settled_at: new Date().toISOString() })
    .eq("id", battleId)
    .is("settled_at", null)
    .select("id");
  if (error) throw error;
  return data.length > 0;
}

export async function listBattleVotes(
  service: SupabaseClient<Database>,
  battleId: string,
): Promise<{ voterId: string; vehicleId: string }[]> {
  const { data, error } = await service
    .from("build_battle_votes")
    .select("voter_id, vehicle_id")
    .eq("battle_id", battleId);
  if (error) throw error;
  return data.map((v) => ({ voterId: v.voter_id, vehicleId: v.vehicle_id }));
}

// --- Skipping the line (0131 build_battle_priority). ---

export type BattlePriority = Database["public"]["Tables"]["build_battle_priority"]["Row"];

/** A car's paid spot that's still waiting, and its newest spot that
 * wasn't refunded (for the once-a-week limit). */
export async function getPriorityForVehicle(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
): Promise<{ open: BattlePriority | null; lastAt: string | null }> {
  const { data, error } = await supabase
    .from("build_battle_priority")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .is("refunded_at", null)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return { open: data.find((r) => r.battle_id === null) ?? null, lastAt: data[0]?.created_at ?? null };
}

/** Server only: records a paid spot. The unique index allows one open
 * spot per car, so a double tap fails here rather than charging twice. */
export async function createPriority(
  service: SupabaseClient<Database>,
  row: { vehicleId: string; userId: string; points: number },
): Promise<BattlePriority> {
  const { data, error } = await service
    .from("build_battle_priority")
    .insert({ vehicle_id: row.vehicleId, user_id: row.userId, points: row.points })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deletePriority(service: SupabaseClient<Database>, id: string): Promise<void> {
  const { error } = await service.from("build_battle_priority").delete().eq("id", id);
  if (error) throw error;
}

/** Waiting paid spots, first paid first. */
export async function listOpenPriority(service: SupabaseClient<Database>): Promise<BattlePriority[]> {
  const { data, error } = await service
    .from("build_battle_priority")
    .select("*")
    .is("battle_id", null)
    .is("refunded_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function assignPriority(service: SupabaseClient<Database>, id: string, battleId: string): Promise<void> {
  const { error } = await service.from("build_battle_priority").update({ battle_id: battleId }).eq("id", id);
  if (error) throw error;
}

/** Marks a waiting spot refunded; true only for the run that did it. */
export async function claimPriorityRefund(service: SupabaseClient<Database>, id: string): Promise<boolean> {
  const { data, error } = await service
    .from("build_battle_priority")
    .update({ refunded_at: new Date().toISOString() })
    .eq("id", id)
    .is("battle_id", null)
    .is("refunded_at", null)
    .select("id");
  if (error) throw error;
  return data.length > 0;
}
