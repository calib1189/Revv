import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { GarageLayout } from "@/lib/garage/layout";

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

export const GARAGE_THEMES = ["workshop", "showroom", "midnight"] as const;
export type GarageTheme = (typeof GARAGE_THEMES)[number];

export async function updateProfileGarageTheme(
  supabase: SupabaseClient<Database>,
  userId: string,
  theme: GarageTheme,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ garage_theme: theme })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfileGarageLayout(
  supabase: SupabaseClient<Database>,
  userId: string,
  layout: GarageLayout,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ garage_layout: layout as unknown as Json })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
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
