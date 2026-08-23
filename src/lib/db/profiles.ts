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
