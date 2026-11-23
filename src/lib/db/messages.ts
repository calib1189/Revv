import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { GifRef } from "@/lib/gifs";

export type Message = Database["public"]["Tables"]["messages"]["Row"];

export async function listMessages(
  supabase: SupabaseClient<Database>,
  conversationId: string,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function sendMessage(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  senderId: string,
  body: string,
  /** A GIF message has an empty body (migration 0130). */
  gif: GifRef | null = null,
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: gif ? "" : body,
      // Only named when there is a GIF, so text messages don't depend on
      // migration 0130 having been applied.
      ...(gif ? { gif_id: gif.id, gif_width: gif.width, gif_height: gif.height } : {}),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function markConversationRead(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);

  if (error) throw error;
}

export async function getLastMessageForConversations(
  supabase: SupabaseClient<Database>,
  conversationIds: string[],
): Promise<Map<string, Message>> {
  const result = new Map<string, Message>();
  if (conversationIds.length === 0) return result;

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  for (const message of data) {
    if (!result.has(message.conversation_id)) {
      result.set(message.conversation_id, message);
    }
  }
  return result;
}

export async function getUnreadMessageCount(
  supabase: SupabaseClient<Database>,
  conversationIds: string[],
  userId: string,
): Promise<number> {
  if (conversationIds.length === 0) return 0;
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .in("conversation_id", conversationIds)
    .neq("sender_id", userId)
    .is("read_at", null);

  if (error) throw error;
  return count ?? 0;
}
