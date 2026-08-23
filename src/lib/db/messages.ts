import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

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
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
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
