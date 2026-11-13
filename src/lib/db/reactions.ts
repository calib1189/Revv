import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { summarizeReactions, type Reaction, type ReactionSummary } from "@/lib/reactions";

type Target = "message" | "comment" | "story";
const TABLE = { message: "message_reactions", comment: "comment_reactions", story: "story_reactions" } as const;
const KEY = { message: "message_id", comment: "comment_id", story: "story_id" } as const;

/** Sets the viewer's reaction on a message or comment, or clears it (null). */
export async function setReaction(
  supabase: SupabaseClient<Database>,
  target: Target,
  id: string,
  userId: string,
  reaction: Reaction | null,
): Promise<void> {
  const untyped = supabase as unknown as SupabaseClient;
  if (reaction === null) {
    const { error } = await untyped.from(TABLE[target]).delete().eq(KEY[target], id).eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await untyped
    .from(TABLE[target])
    .upsert({ [KEY[target]]: id, user_id: userId, reaction }, { onConflict: `${KEY[target]},user_id` });
  if (error) throw error;
}

/** Each message's or comment's reactions, summed up for the viewer. */
export async function getReactionSummaries(
  supabase: SupabaseClient<Database>,
  target: Target,
  ids: string[],
  viewerId: string | null,
): Promise<Map<string, ReactionSummary>> {
  const out = new Map<string, ReactionSummary>();
  if (ids.length === 0) return out;
  const untyped = supabase as unknown as SupabaseClient;
  const { data, error } = await untyped.from(TABLE[target]).select(`${KEY[target]}, user_id, reaction`).in(KEY[target], ids);
  if (error) throw error;
  const byId = new Map<string, { userId: string; reaction: string }[]>();
  for (const row of (data ?? []) as Record<string, string>[]) {
    const key = row[KEY[target]];
    const list = byId.get(key) ?? [];
    list.push({ userId: row.user_id, reaction: row.reaction });
    byId.set(key, list);
  }
  for (const [id, rows] of byId) out.set(id, summarizeReactions(rows, viewerId));
  return out;
}
