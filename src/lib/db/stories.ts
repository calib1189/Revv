import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

export type Story = Database["public"]["Tables"]["stories"]["Row"];

export async function createStory(
  supabase: SupabaseClient<Database>,
  input: { authorId: string; mediaId: string; design: Json | null },
): Promise<Story> {
  const { data, error } = await supabase
    .from("stories")
    .insert({ author_id: input.authorId, media_id: input.mediaId, design: input.design })
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

/** A viewer's vote on a story poll; voting again is ignored. */
export async function votePoll(
  supabase: SupabaseClient<Database>,
  input: { storyId: string; layerId: string; voterId: string; option: 0 | 1 },
): Promise<void> {
  const { error } = await supabase
    .from("story_poll_votes")
    .upsert(
      { story_id: input.storyId, layer_id: input.layerId, voter_id: input.voterId, option: input.option },
      { onConflict: "story_id,layer_id,voter_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

/** Vote tallies for a story's polls: layer id -> [option 0, option 1]. */
export async function getPollCounts(supabase: SupabaseClient<Database>, storyId: string): Promise<Map<string, [number, number]>> {
  const untyped = supabase as unknown as SupabaseClient;
  const { data, error } = await untyped.rpc("story_poll_counts", { p_story: storyId });
  if (error) throw error;
  const counts = new Map<string, [number, number]>();
  for (const row of (data ?? []) as { layer_id: string; option: number; votes: number }[]) {
    const c = counts.get(row.layer_id) ?? [0, 0];
    c[row.option === 1 ? 1 : 0] = Number(row.votes);
    counts.set(row.layer_id, c);
  }
  return counts;
}

/** The viewer's own votes on these stories: "storyId:layerId" -> option. */
export async function listMyPollVotes(
  supabase: SupabaseClient<Database>,
  voterId: string,
  storyIds: string[],
): Promise<Map<string, 0 | 1>> {
  const votes = new Map<string, 0 | 1>();
  if (storyIds.length === 0) return votes;
  const { data, error } = await supabase
    .from("story_poll_votes")
    .select("story_id, layer_id, option")
    .eq("voter_id", voterId)
    .in("story_id", storyIds);
  if (error) throw error;
  for (const row of data) votes.set(`${row.story_id}:${row.layer_id}`, row.option === 1 ? 1 : 0);
  return votes;
}

export async function createQuestionAnswer(
  supabase: SupabaseClient<Database>,
  input: { storyId: string; layerId: string; responderId: string; body: string },
): Promise<void> {
  const { error } = await supabase
    .from("story_question_answers")
    .insert({ story_id: input.storyId, layer_id: input.layerId, responder_id: input.responderId, body: input.body });
  if (error) throw error;
}

/** Answers to the question on your story, newest first (RLS: author only). */
export async function listQuestionAnswers(
  supabase: SupabaseClient<Database>,
  storyId: string,
): Promise<{ id: string; responderId: string; body: string; createdAt: string }[]> {
  const { data, error } = await supabase
    .from("story_question_answers")
    .select("id, responder_id, body, created_at")
    .eq("story_id", storyId)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return data.map((r) => ({ id: r.id, responderId: r.responder_id, body: r.body, createdAt: r.created_at }));
}

/** How many answers each of your stories' questions got. */
export async function getAnswerCounts(supabase: SupabaseClient<Database>, storyIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (storyIds.length === 0) return counts;
  const { data, error } = await supabase.from("story_question_answers").select("story_id").in("story_id", storyIds);
  if (error) throw error;
  for (const row of data) counts.set(row.story_id, (counts.get(row.story_id) ?? 0) + 1);
  return counts;
}
