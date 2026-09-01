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

/** New followers gained since a given timestamp — for a creator's own
 * "this week" summary. Not attributable to any specific post (a follow
 * doesn't record what someone was looking at when they tapped it), so
 * this is an account-level number only. */
export async function getNewFollowerCount(
  supabase: SupabaseClient<Database>,
  userId: string,
  sinceIso: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("followee_id", userId)
    .gte("created_at", sinceIso);
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

/** IDs of the people this user follows, most recently followed first. */
export async function listFollowingIds(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => row.followee_id);
}

/** IDs of the people who follow this user, most recent first. */
export async function listFollowerIds(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("followee_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => row.follower_id);
}
