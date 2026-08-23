import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function followUser(
  supabase: SupabaseClient<Database>,
  followerId: string,
  followeeId: string,
): Promise<void> {
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: followerId, followee_id: followeeId });
  if (error) throw error;
}

export async function unfollowUser(
  supabase: SupabaseClient<Database>,
  followerId: string,
  followeeId: string,
): Promise<void> {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("followee_id", followeeId);
  if (error) throw error;
}

export async function isFollowing(
  supabase: SupabaseClient<Database>,
  followerId: string,
  followeeId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("followee_id", followeeId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function getFollowerCount(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("followee_id", userId);
  if (error) throw error;
  return count ?? 0;
}

export async function getFollowingCount(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);
  if (error) throw error;
  return count ?? 0;
}
