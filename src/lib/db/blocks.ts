import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function blockUser(
  supabase: SupabaseClient<Database>,
  blockerId: string,
  blockedId: string,
): Promise<void> {
  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(
  supabase: SupabaseClient<Database>,
  blockerId: string,
  blockedId: string,
): Promise<void> {
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function isBlocking(
  supabase: SupabaseClient<Database>,
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("blocks")
    .select("blocker_id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function listBlockedUserIds(
  supabase: SupabaseClient<Database>,
  blockerId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", blockerId);
  if (error) throw error;
  return data.map((row) => row.blocked_id);
}
