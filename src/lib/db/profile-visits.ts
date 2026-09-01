import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Records a profile visit — `sourcePostId` is set only when the visitor
 * reached this profile via a `?from=<postId>` link from a post (see
 * swipe-slide.tsx / post-card.tsx), null for everything else (a direct
 * link, search, typing a username). Never called for a logged-out
 * visitor or someone viewing their own profile — see the call site in
 * app/u/[username]/page.tsx for why. */
export async function recordProfileVisit(
  supabase: SupabaseClient<Database>,
  visitorId: string,
  profileId: string,
  sourcePostId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("profile_visits")
    .insert({ visitor_id: visitorId, profile_id: profileId, source_post_id: sourcePostId });
  if (error) throw error;
}

/** post_id -> count of profile visits attributed to it, for a batch of
 * posts — backs Creator Studio's per-post "profile visits" stat. */
export async function getProfileVisitCountsBySourcePost(
  supabase: SupabaseClient<Database>,
  postIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (postIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("profile_visits")
    .select("source_post_id")
    .in("source_post_id", postIds);
  if (error) throw error;

  for (const row of data) {
    if (!row.source_post_id) continue;
    counts.set(row.source_post_id, (counts.get(row.source_post_id) ?? 0) + 1);
  }
  return counts;
}
