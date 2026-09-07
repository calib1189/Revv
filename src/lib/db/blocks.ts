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

/** Everyone the calling user is blocked with, in *either* direction —
 * unlike listBlockedUserIds, this also surfaces people who blocked the
 * caller, which a plain client query can't see (blocks' own RLS only
 * lets a user read rows where they're the blocker). Goes through the
 * blocked_user_ids() SECURITY DEFINER function (0082) for exactly that
 * reason, and only ever returns the *calling* user's own list — the
 * function takes no target parameter, so it can't be used to look up
 * anyone else's blocks. Used to keep a blocked pair's content out of
 * each other's feed. */
export async function listBlockedEitherDirection(
  supabase: SupabaseClient<Database>,
): Promise<string[]> {
  // Same untyped-cast-and-.rpc() pattern as the rate-limit checks and
  // shop-promotion-events — the hand-written Database type has no
  // Functions map at all (see its own file header), so this is the
  // established way to call a Postgres RPC without destabilizing the
  // typed embedded-select inference everywhere else.
  const untyped = supabase as unknown as SupabaseClient;
  const { data, error } = await untyped.rpc("blocked_user_ids");
  if (error) throw error;
  return (data as string[] | null) ?? [];
}
