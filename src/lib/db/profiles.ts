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
