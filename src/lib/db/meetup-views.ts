import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Same cooldown reasoning as post-views.ts — every rewatch/revisit counts,
 * just not unboundedly if someone reloads the page repeatedly. */
const VIEW_COOLDOWN_SECONDS = 30;

export async function recordMeetupView(
  supabase: SupabaseClient<Database>,
  meetupId: string,
  viewerId: string,
): Promise<void> {
  const cooldownCutoff = new Date(Date.now() - VIEW_COOLDOWN_SECONDS * 1000).toISOString();
  const { data: recent, error: recentError } = await supabase
    .from("meetup_views")
    .select("id")
    .eq("meetup_id", meetupId)
    .eq("viewer_id", viewerId)
    .gte("created_at", cooldownCutoff)
    .limit(1);
  if (recentError) throw recentError;
  if (recent.length > 0) return;

  const { error } = await supabase
    .from("meetup_views")
    .insert({ meetup_id: meetupId, viewer_id: viewerId });
  if (error) throw error;
}

export async function getMeetupViewCount(
  supabase: SupabaseClient<Database>,
  meetupId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("meetup_views")
    .select("*", { count: "exact", head: true })
    .eq("meetup_id", meetupId);
  if (error) throw error;
  return count ?? 0;
}

/** meetup_id -> view count, for a batch of meetups (avoids N+1 count queries). */
export async function getMeetupViewCountsForMeetups(
  supabase: SupabaseClient<Database>,
  meetupIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (meetupIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("meetup_views")
    .select("meetup_id")
    .in("meetup_id", meetupIds);
  if (error) throw error;

  for (const row of data) {
    counts.set(row.meetup_id, (counts.get(row.meetup_id) ?? 0) + 1);
  }
  return counts;
}
