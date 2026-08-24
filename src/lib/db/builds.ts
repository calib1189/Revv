import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

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
 * them to the bottom, since "unrated" isn't a rank. */
export async function listTopRatedBuilds(
  supabase: SupabaseClient<Database>,
  limit = 50,
): Promise<Build[]> {
  const { data, error } = await supabase
    .from("builds")
    .select("*")
    .eq("status", "active")
    .not("ai_rating_score", "is", null)
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
  rating: { score: number; strengths: string; limitingFactors: string },
): Promise<Build> {
  const { data, error } = await supabase
    .from("builds")
    .update({
      ai_rating_score: rating.score,
      ai_rating_strengths: rating.strengths,
      ai_rating_limiting_factors: rating.limitingFactors,
      ai_rating_rated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
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
