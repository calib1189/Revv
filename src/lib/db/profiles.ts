import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function getProfileByUserId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  username: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, username })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getProfileByUsername(
  supabase: SupabaseClient<Database>,
  username: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getProfilesByIds(
  supabase: SupabaseClient<Database>,
  userIds: string[],
): Promise<Profile[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (error) throw error;
  return data;
}

/** Profile info for the sitemap — every profile is publicly readable,
 * but a banned user's profile shouldn't be actively promoted in search
 * results even though it still works if linked directly. Capped and
 * ordered by recency for the same unbounded-sitemap reason as
 * listSitemapVehicles/listSitemapPosts. */
export async function listSitemapProfiles(
  supabase: SupabaseClient<Database>,
  limit = 5000,
): Promise<{ id: string; username: string; isBanned: boolean; createdAt: string }[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, is_banned, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data.map((p) => ({
    id: p.id,
    username: p.username,
    isBanned: p.is_banned,
    createdAt: p.created_at,
  }));
}

export async function searchProfilesByUsername(
  supabase: SupabaseClient<Database>,
  query: string,
  limit = 20,
): Promise<Profile[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", `%${trimmed}%`)
    .order("username", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function updateProfileBio(
  supabase: SupabaseClient<Database>,
  userId: string,
  bio: string | null,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ bio })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfileUsername(
  supabase: SupabaseClient<Database>,
  userId: string,
  username: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function markProfileOnboarded(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", userId)
    .is("onboarded_at", null);

  if (error) throw error;
}

export async function updateProfileDisplayName(
  supabase: SupabaseClient<Database>,
  userId: string,
  displayName: string | null,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** Blocks/unblocks new posts and comments at the RLS layer (see
 * 0055_user_bans.sql) — not a full account lockout, login still works. */
export async function setUserBanned(
  supabase: SupabaseClient<Database>,
  userId: string,
  banned: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_banned: banned, banned_at: banned ? new Date().toISOString() : null })
    .eq("id", userId);
  if (error) throw error;
}

export async function updateProfileAvatar(
  supabase: SupabaseClient<Database>,
  userId: string,
  avatarMediaId: string | null,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_media_id: avatarMediaId })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
