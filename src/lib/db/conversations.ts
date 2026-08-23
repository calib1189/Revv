import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];

/** conversations.user_a_id must be the smaller uuid — normalize here so
 * callers never have to think about ordering. */
function orderPair(userId: string, otherUserId: string): [string, string] {
  return userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];
}

export async function getConversationBetween(
  supabase: SupabaseClient<Database>,
  userId: string,
  otherUserId: string,
): Promise<Conversation | null> {
  const [userAId, userBId] = orderPair(userId, otherUserId);
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_a_id", userAId)
    .eq("user_b_id", userBId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getOrCreateConversation(
  supabase: SupabaseClient<Database>,
  userId: string,
  otherUserId: string,
): Promise<Conversation> {
  const existing = await getConversationBetween(supabase, userId, otherUserId);
  if (existing) return existing;

  const [userAId, userBId] = orderPair(userId, otherUserId);
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_a_id: userAId, user_b_id: userBId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listConversationsForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export function otherParticipant(
  conversation: Conversation,
  userId: string,
): string {
  return conversation.user_a_id === userId
    ? conversation.user_b_id
    : conversation.user_a_id;
}
