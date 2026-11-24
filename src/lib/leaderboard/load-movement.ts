import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listBoardScores } from "@/lib/db/builds";
import { listBuildRatingHistoryForBuilds } from "@/lib/db/build-rating-history";
import { rankMovement, type RankMovement } from "@/lib/leaderboard/movement";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How each build on a board moved over the last 24 hours. `vehicleIds`
 * is the board's own filter (approved cars, narrowed by category and
 * scope), so a category board measures movement within that category.
 * Only builds re-rated in the window need their history read. */
export async function loadRankMovement(
  supabase: SupabaseClient<Database>,
  vehicleIds: string[],
  now: Date = new Date(),
): Promise<Map<string, RankMovement>> {
  const since = new Date(now.getTime() - DAY_MS);
  const board = await listBoardScores(supabase, vehicleIds);
  const changed = board.filter((b) => b.ratedAt && new Date(b.ratedAt) > since).map((b) => b.buildId);
  if (changed.length === 0) return new Map();
  const history = await listBuildRatingHistoryForBuilds(supabase, changed);
  return rankMovement(
    board,
    history.map((h) => ({ buildId: h.buildId, score: h.score, ratedAt: h.ratedAt })),
    since,
  );
}
