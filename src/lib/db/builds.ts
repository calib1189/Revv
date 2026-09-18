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

/** Callable only with a service-role client — protect_ai_rating_columns
 * (0088) silently reverts every ai_rating_ and ai_rating_pending_ column
 * on any write coming from the 'authenticated' role, regardless of RLS.
 * This is the one legitimate write path: confirmBuildRatingAction, after
 * verifying (via getPendingBuildRating) that the values being promoted
 * are what the server itself generated, not whatever a caller supplied. */
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
      // Cleared in the same write a rating is promoted, so a stale
      // pending value can never be confirmed twice.
      ai_rating_pending_score: null,
      ai_rating_pending_strengths: null,
      ai_rating_pending_limiting_factors: null,
      ai_rating_pending_subscores: null,
      ai_rating_pending_is_mock: null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export interface PendingBuildRating {
  score: number;
  strengths: string;
  limitingFactors: string;
  subscores: BuildRatingSubscores;
  isMock: boolean;
}

/** Stores exactly what provider.rateBuild() returned — called only with a
 * service-role client, right after that real call resolves
 * (generateBuildRatingAction). This is the one place rating content is
 * ever written from server-derived data rather than a caller's own
 * input, which is what makes confirming it afterward trustworthy. */
export async function savePendingBuildRating(
  supabase: SupabaseClient<Database>,
  id: string,
  rating: PendingBuildRating,
): Promise<void> {
  const { error } = await supabase
    .from("builds")
    .update({
      ai_rating_pending_score: rating.score,
      ai_rating_pending_strengths: rating.strengths,
      ai_rating_pending_limiting_factors: rating.limitingFactors,
      ai_rating_pending_subscores: rating.subscores as unknown as Json,
      ai_rating_pending_is_mock: rating.isMock,
    })
    .eq("id", id);
  if (error) throw error;
}

/** What confirmBuildRatingAction actually promotes — null when nothing's
 * pending (never generated, or already confirmed/cleared), which the
 * action treats as "nothing to confirm" rather than trusting a caller to
 * supply the content itself. */
export async function getPendingBuildRating(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<PendingBuildRating | null> {
  const { data, error } = await supabase
    .from("builds")
    .select(
      "ai_rating_pending_score, ai_rating_pending_strengths, ai_rating_pending_limiting_factors, ai_rating_pending_subscores, ai_rating_pending_is_mock",
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  if (
    data.ai_rating_pending_score == null ||
    data.ai_rating_pending_strengths == null ||
    data.ai_rating_pending_limiting_factors == null ||
    data.ai_rating_pending_subscores == null
  ) {
    return null;
  }

  return {
    score: data.ai_rating_pending_score,
    strengths: data.ai_rating_pending_strengths,
    limitingFactors: data.ai_rating_pending_limiting_factors,
    subscores: data.ai_rating_pending_subscores as unknown as BuildRatingSubscores,
    isMock: data.ai_rating_pending_is_mock ?? false,
  };
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

/** How many OTHER builds have copy-built from any of `buildIds` — for
 * the "someone copied your build" achievement. Never counts a build
 * copying itself since copied_from_build_id always points at a
 * different build's id. */
export async function countBuildsCopiedFrom(
  supabase: SupabaseClient<Database>,
  buildIds: string[],
): Promise<number> {
  if (buildIds.length === 0) return 0;
  const { count, error } = await supabase
    .from("builds")
    .select("*", { count: "exact", head: true })
    .in("copied_from_build_id", buildIds);
  if (error) throw error;
  return count ?? 0;
}
