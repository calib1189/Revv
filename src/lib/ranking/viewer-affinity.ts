import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface ViewerAffinityProfile {
  /** Vehicle categories (the same values as vehicles.category) the
   * viewer has recently liked, saved, shared, or watched a video all
   * the way through on. */
  categories: Set<string>;
  /** Vehicle makes, lowercased for case-insensitive matching. */
  makes: Set<string>;
}

export const EMPTY_AFFINITY: ViewerAffinityProfile = { categories: new Set(), makes: new Set() };

const AFFINITY_WINDOW_DAYS = 60;
// Bounds each signal's own lookback query — a viewer with thousands of
// likes doesn't need all of them consulted to know what they're
// currently into, and this keeps the query cheap regardless of how
// long someone's been using the app.
const AFFINITY_ROWS_PER_SIGNAL = 200;

/** What a viewer has actually shown interest in lately, derived at read
 * time from their own engagement rows — not a stored "preferences"
 * profile that would need to be kept in sync as they engage with more
 * things. Feeds the category/make affinity boost in feed-score.ts. */
export async function getViewerAffinity(
  supabase: SupabaseClient<Database>,
  viewerId: string,
): Promise<ViewerAffinityProfile> {
  const since = new Date(Date.now() - AFFINITY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [likes, saves, shares, completions] = await Promise.all([
    supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", viewerId)
      .gte("created_at", since)
      .limit(AFFINITY_ROWS_PER_SIGNAL),
    supabase
      .from("saves")
      .select("post_id")
      .eq("user_id", viewerId)
      .gte("created_at", since)
      .limit(AFFINITY_ROWS_PER_SIGNAL),
    supabase
      .from("post_shares")
      .select("post_id")
      .eq("sharer_id", viewerId)
      .gte("created_at", since)
      .limit(AFFINITY_ROWS_PER_SIGNAL),
    supabase
      .from("post_view_completions")
      .select("post_id")
      .eq("viewer_id", viewerId)
      .gte("created_at", since)
      .limit(AFFINITY_ROWS_PER_SIGNAL),
  ]);
  for (const result of [likes, saves, shares, completions]) {
    if (result.error) throw result.error;
  }

  const postIds = [
    ...new Set(
      [...likes.data!, ...saves.data!, ...shares.data!, ...completions.data!].map((row) => row.post_id),
    ),
  ];
  if (postIds.length === 0) return EMPTY_AFFINITY;

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("vehicle_id")
    .in("id", postIds);
  if (postsError) throw postsError;

  const vehicleIds = [...new Set(posts.map((p) => p.vehicle_id).filter((id): id is string => Boolean(id)))];
  if (vehicleIds.length === 0) return EMPTY_AFFINITY;

  const { data: vehicles, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("category, make")
    .in("id", vehicleIds);
  if (vehiclesError) throw vehiclesError;

  const categories = new Set(vehicles.map((v) => v.category));
  const makes = new Set(
    vehicles.filter((v): v is typeof v & { make: string } => Boolean(v.make)).map((v) => v.make.toLowerCase()),
  );
  return { categories, makes };
}
