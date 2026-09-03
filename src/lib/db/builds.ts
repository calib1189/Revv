import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { BuildRatingSubscores } from "@/lib/providers/rating-provider";

export type Build = Database["public"]["Tables"]["builds"]["Row"];
export type BuildInsert = Database["public"]["Tables"]["builds"]["Insert"];

export async function getActiveBuild(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
): Promise<Build | null> {
  const { data, error } = await supabase
    .from("builds")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** One active build per vehicle_id, for card grids that need a rating
 * badge without an N+1 query per vehicle. */
export async function listActiveBuildsByVehicleIds(
  supabase: SupabaseClient<Database>,
  vehicleIds: string[],
): Promise<Map<string, Build>> {
  if (vehicleIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("builds")
    .select("*")
    .eq("status", "active")
    .in("vehicle_id", vehicleIds);

  if (error) throw error;
  return new Map(data.map((build) => [build.vehicle_id, build]));
}

/** Highest-rated active builds across all vehicles, for the leaderboard.
 * Unrated builds (ai_rating_score null) are excluded rather than sorting
 * them to the bottom, since "unrated" isn't a rank. Pass `vehicleIds` to
 * scope this to one category's leaderboard (see
 * listVehicleIdsByCategory) — omit it for the combined, all-categories
 * view. */
export async function listTopRatedBuilds(
  supabase: SupabaseClient<Database>,
  limit = 50,
  vehicleIds?: string[],
): Promise<Build[]> {
  let query = supabase
    .from("builds")
    .select("*")
    .eq("status", "active")
    .not("ai_rating_score", "is", null);

  if (vehicleIds) {
    if (vehicleIds.length === 0) return [];
    query = query.in("vehicle_id", vehicleIds);
  }

  const { data, error } = await query
    .order("ai_rating_score", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getBuildById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Build | null> {
  const { data, error } = await supabase
    .from("builds")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createBuild(
  supabase: SupabaseClient<Database>,
  input: BuildInsert,
): Promise<Build> {
  const { data, error } = await supabase
    .from("builds")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateBuildStatus(
  supabase: SupabaseClient<Database>,
  id: string,
  status: Build["status"],
): Promise<Build> {
  const { data, error } = await supabase
    .from("builds")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateBuildRating(
  supabase: SupabaseClient<Database>,
  id: string,
  rating: {
    score: number;
    strengths: string;
    limitingFactors: string;
    subscores: BuildRatingSubscores;
  },
): Promise<Build> {
  const { data, error } = await supabase
    .from("builds")
    .update({
      ai_rating_score: rating.score,
      ai_rating_strengths: rating.strengths,
      ai_rating_limiting_factors: rating.limitingFactors,
      ai_rating_subscores: rating.subscores as unknown as Json,
      ai_rating_rated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** Marks the moment an AI rating call actually happened — independent of
 * ai_rating_rated_at (only set when a rating is confirmed). This is what
 * the 24h rate limit checks in generateBuildRatingAction: without it, a
 * generated-but-discarded rating left no trace, so re-rating could be
 * spammed indefinitely just by never clicking "Show this rating". */
export async function markBuildRatingAttempt(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("builds")
    .update({ ai_rating_last_attempt_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Just the score column, for percentile math (see lib/rating/percentile.ts)
 * — the leaderboard's own eligibility population (active, rated, and
 * optionally scoped to a category's verified vehicle ids), not every
 * build ever rated. */
export async function listAllRatingScores(
  supabase: SupabaseClient<Database>,
  vehicleIds?: string[],
): Promise<number[]> {
  let query = supabase
    .from("builds")
    .select("ai_rating_score")
    .eq("status", "active")
    .not("ai_rating_score", "is", null);

  if (vehicleIds) {
    if (vehicleIds.length === 0) return [];
    query = query.in("vehicle_id", vehicleIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.map((b) => b.ai_rating_score).filter((s): s is number => s != null);
}

export async function updateBuildBudget(
  supabase: SupabaseClient<Database>,
  id: string,
  budgetCents: number | null,
): Promise<Build> {
  const { data, error } = await supabase
    .from("builds")
    .update({ budget_cents: budgetCents })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBuild(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("builds").delete().eq("id", id);
  if (error) throw error;
}

/** Vehicles get their build lazily, on first use (e.g. adding a mod). */
export async function getOrCreateActiveBuild(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
): Promise<Build> {
  const existing = await getActiveBuild(supabase, vehicleId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("builds")
    .insert({ vehicle_id: vehicleId, status: "active" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
