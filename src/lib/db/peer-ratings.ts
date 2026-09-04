import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface PeerRatingSummary {
  average: number | null;
  count: number;
}

/** Computed at read time from the raw rows — never stored, same rule
 * every other derived number in this app follows. Null average with a
 * real 0 count is "nobody's rated this yet", distinct from an average
 * that happens to round to a low number. */
export async function getPeerRatingSummary(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
): Promise<PeerRatingSummary> {
  const { data, error } = await supabase.from("peer_ratings").select("stars").eq("vehicle_id", vehicleId);
  if (error) throw error;
  if (data.length === 0) return { average: null, count: 0 };
  const average = data.reduce((sum, row) => sum + row.stars, 0) / data.length;
  return { average, count: data.length };
}

/** Batched summaries for several vehicles at once — for list contexts
 * (a garage grid, a leaderboard) rather than one query per card. */
export async function getPeerRatingSummariesForVehicles(
  supabase: SupabaseClient<Database>,
  vehicleIds: string[],
): Promise<Map<string, PeerRatingSummary>> {
  if (vehicleIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("peer_ratings")
    .select("vehicle_id, stars")
    .in("vehicle_id", vehicleIds);
  if (error) throw error;

  const starsByVehicle = new Map<string, number[]>();
  for (const row of data) {
    const list = starsByVehicle.get(row.vehicle_id) ?? [];
    list.push(row.stars);
    starsByVehicle.set(row.vehicle_id, list);
  }
  const summaries = new Map<string, PeerRatingSummary>();
  for (const [vehicleId, stars] of starsByVehicle) {
    summaries.set(vehicleId, { average: stars.reduce((a, b) => a + b, 0) / stars.length, count: stars.length });
  }
  return summaries;
}

export async function getMyPeerRating(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  raterId: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("peer_ratings")
    .select("stars")
    .eq("vehicle_id", vehicleId)
    .eq("rater_id", raterId)
    .maybeSingle();
  if (error) throw error;
  return data?.stars ?? null;
}

export async function upsertPeerRating(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  raterId: string,
  stars: number,
): Promise<void> {
  const { error } = await supabase
    .from("peer_ratings")
    .upsert(
      { vehicle_id: vehicleId, rater_id: raterId, stars, updated_at: new Date().toISOString() },
      { onConflict: "vehicle_id,rater_id" },
    );
  if (error) throw error;
}

export async function deletePeerRating(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  raterId: string,
): Promise<void> {
  const { error } = await supabase
    .from("peer_ratings")
    .delete()
    .eq("vehicle_id", vehicleId)
    .eq("rater_id", raterId);
  if (error) throw error;
}

/** All-time count of peer ratings this user has GIVEN — for achievement
 * thresholds (lib/achievements/unlock.ts), where "rated a build" counts
 * regardless of whether it was an AI rating of your own car or a peer
 * rating of someone else's. */
export async function countPeerRatingsGivenByUser(
  supabase: SupabaseClient<Database>,
  raterId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("peer_ratings")
    .select("*", { count: "exact", head: true })
    .eq("rater_id", raterId);
  if (error) throw error;
  return count ?? 0;
}

/** Peer ratings given since a given timestamp — for weekly challenge
 * progress (lib/challenges/progress.ts). */
export async function countPeerRatingsGivenSince(
  supabase: SupabaseClient<Database>,
  raterId: string,
  since: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("peer_ratings")
    .select("*", { count: "exact", head: true })
    .eq("rater_id", raterId)
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}
