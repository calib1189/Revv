"use server";

import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { setReaction } from "@/lib/db/reactions";
import { getCommentById } from "@/lib/db/comments";
import { getProfileByUserId } from "@/lib/db/profiles";
import { sendPushToUser } from "@/lib/push/send";
import { isReaction, type Reaction } from "@/lib/reactions";

const REACTION_VERB: Record<Reaction, string> = {
  heart: "loved",
  fire: "reacted fire to",
  laugh: "laughed at",
  wow: "was wowed by",
  sad: "reacted sad to",
  up: "liked",
};

type Result = { ok: boolean };

/** React to a DM (or take the reaction back with null). Only the two
 * people in the conversation can (RLS). */
export async function reactToMessageAction(messageId: string, reaction: string | null): Promise<Result> {
  const user = await getCurrentUser();
  if (!user || (reaction !== null && !isReaction(reaction))) return { ok: false };
  const supabase = await createClient();
  const { data: message } = await supabase.from("messages").select("id, sender_id, conversation_id").eq("id", messageId).maybeSingle();
  if (!message) return { ok: false };
  const { data: before } = await supabase
    .from("message_reactions")
    .select("reaction")
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .maybeSingle();
  try {
    await setReaction(supabase, "message", messageId, user.id, reaction as Reaction | null);
  } catch (err) {
    console.error("Message reaction not saved:", err);
    return { ok: false };
  }
  // A push for a new reaction on their message, not for changing it.
  if (reaction && !before && message.sender_id !== user.id) {
    after(() => pushReaction(supabase, user.id, message.sender_id, reaction as Reaction, "your message", `/messages/${message.conversation_id}`, "messages"));
  }
  return { ok: true };
}

/** React to a comment (or take it back with null). */
export async function reactToCommentAction(commentId: string, reaction: string | null): Promise<Result> {
  const user = await getCurrentUser();
  if (!user || (reaction !== null && !isReaction(reaction))) return { ok: false };
  const supabase = await createClient();
  const comment = await getCommentById(supabase, commentId).catch(() => null);
  if (!comment) return { ok: false };
  const { data: before } = await supabase
    .from("comment_reactions")
    .select("reaction")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .maybeSingle();
  try {
    await setReaction(supabase, "comment", commentId, user.id, reaction as Reaction | null);
  } catch (err) {
    console.error("Comment reaction not saved:", err);
    return { ok: false };
  }
  // The in-app notification comes from the database (0117).
  if (reaction && !before && comment.author_id !== user.id) {
    after(() => pushReaction(supabase, user.id, comment.author_id, reaction as Reaction, "your comment", `/p/${comment.post_id}`, "likes"));
  }
  return { ok: true };
}

/** React to someone's story (or take it back with null). The story's
 * author is the only one who sees it. */
export async function reactToStoryAction(storyId: string, reaction: string | null): Promise<Result> {
  const user = await getCurrentUser();
  if (!user || (reaction !== null && !isReaction(reaction))) return { ok: false };
  const supabase = await createClient();
  const { data: story } = await supabase.from("stories").select("id, author_id").eq("id", storyId).maybeSingle();
  if (!story || story.author_id === user.id) return { ok: false };
  const { data: before } = await supabase
    .from("story_reactions")
    .select("reaction")
    .eq("story_id", storyId)
    .eq("user_id", user.id)
    .maybeSingle();
  try {
    await setReaction(supabase, "story", storyId, user.id, reaction as Reaction | null);
  } catch (err) {
    console.error("Story reaction not saved:", err);
    return { ok: false };
  }
  // The in-app notification comes from the database (0118).
  if (reaction && !before) {
    after(() => pushReaction(supabase, user.id, story.author_id, reaction as Reaction, "your story", `/stories/${storyId}`, "likes"));
  }
  return { ok: true };
}

async function pushReaction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  toId: string,
  reaction: Reaction,
  what: string,
  url: string,
  category: "messages" | "likes",
) {
  const actor = await getProfileByUserId(supabase, actorId).catch(() => null);
  await sendPushToUser(
    toId,
    { title: "SORZA", body: `@${actor?.username ?? "Someone"} ${REACTION_VERB[reaction]} ${what}`, url },
    category,
  );
}
