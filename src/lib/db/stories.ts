import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Story = Database["public"]["Tables"]["stories"]["Row"];

export async function createStory(
  supabase: SupabaseClient<Database>,
  input: { authorId: string; mediaId: string; caption: string | null },
): Promise<Story> {
  const { data, error } = await supabase
    .from("stories")
    .insert({ author_id: input.authorId, media_id: input.mediaId, caption: input.caption })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Live (unexpired) stories by these authors, oldest first, the order
 * they play in. */
export async function listLiveStoriesByAuthors(
  supabase: SupabaseClient<Database>,
  authorIds: string[],
): Promise<Story[]> {
  if (authorIds.length === 0) return [];
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .in("author_id", authorIds)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getStoryById(supabase: SupabaseClient<Database>, id: string): Promise<Story | null> {
  const { data, error } = await supabase.from("stories").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Which of these stories the viewer has already watched. */
export async function listSeenStoryIds(
  supabase: SupabaseClient<Database>,
  viewerId: string,
  storyIds: string[],
): Promise<Set<string>> {
  if (storyIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("story_views")
    .select("story_id")
    .eq("viewer_id", viewerId)
    .in("story_id", storyIds);
  if (error) throw error;
  return new Set(data.map((row) => row.story_id));
}

/** Records that the viewer watched a story; watching it again is a no-op. */
export async function recordStoryView(
  supabase: SupabaseClient<Database>,
  storyId: string,
  viewerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("story_views")
    .upsert({ story_id: storyId, viewer_id: viewerId }, { onConflict: "story_id,viewer_id", ignoreDuplicates: true });
  if (error) throw error;
}

/** Who watched a story, most recent first. Only its author can read these (RLS). */
export async function listStoryViews(
  supabase: SupabaseClient<Database>,
  storyId: string,
): Promise<{ viewerId: string; viewedAt: string }[]> {
  const { data, error } = await supabase
    .from("story_views")
    .select("viewer_id, viewed_at")
    .eq("story_id", storyId)
    .order("viewed_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data.map((row) => ({ viewerId: row.viewer_id, viewedAt: row.viewed_at }));
}

/** How many people watched each of these stories. */
export async function getStoryViewCounts(
  supabase: SupabaseClient<Database>,
  storyIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (storyIds.length === 0) return counts;
  const { data, error } = await supabase.from("story_views").select("story_id").in("story_id", storyIds);
  if (error) throw error;
  for (const row of data) counts.set(row.story_id, (counts.get(row.story_id) ?? 0) + 1);
  return counts;
}

export async function deleteStory(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const { error } = await supabase.from("stories").delete().eq("id", id);
  if (error) throw error;
}
