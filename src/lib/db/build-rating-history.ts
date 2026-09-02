import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { BuildRatingSubscores } from "@/lib/providers/rating-provider";

export type BuildRatingHistoryRow = Database["public"]["Tables"]["build_rating_history"]["Row"];

export interface BuildRatingHistoryEntry {
  score: number;
  subscores: BuildRatingSubscores | null;
  ratedAt: string;
  isMock: boolean;
}

/** One row per confirmed rating (see confirmBuildRatingAction) — never
 * updated or deleted, so this is a true history, not the build's
 * current rating (that's still builds.ai_rating_score, read separately). */
export async function insertBuildRatingHistory(
  supabase: SupabaseClient<Database>,
  buildId: string,
  rating: {
    score: number;
    strengths: string;
    limitingFactors: string;
    subscores: BuildRatingSubscores;
    isMock: boolean;
  },
): Promise<void> {
  const { error } = await supabase.from("build_rating_history").insert({
    build_id: buildId,
    score: rating.score,
    strengths: rating.strengths,
    limiting_factors: rating.limitingFactors,
    subscores: rating.subscores as unknown as Database["public"]["Tables"]["build_rating_history"]["Row"]["subscores"],
    is_mock: rating.isMock,
  });
  if (error) throw error;
}

/** Oldest first — the natural order for a timeline/sparkline. Capped at
 * a generous but bounded count so a build re-rated hundreds of times
 * over years can't make this an unbounded query. */
export async function listBuildRatingHistory(
  supabase: SupabaseClient<Database>,
  buildId: string,
  limit = 200,
): Promise<BuildRatingHistoryEntry[]> {
  const { data, error } = await supabase
    .from("build_rating_history")
    .select("score, subscores, rated_at, is_mock")
    .eq("build_id", buildId)
    .order("rated_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data.map((row) => ({
    score: row.score,
    subscores: row.subscores as unknown as BuildRatingSubscores | null,
    ratedAt: row.rated_at,
    isMock: row.is_mock,
  }));
}
