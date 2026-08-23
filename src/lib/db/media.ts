import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Media = Database["public"]["Tables"]["media"]["Row"];
export type MediaInsert = Database["public"]["Tables"]["media"]["Insert"];

export async function createMedia(
  supabase: SupabaseClient<Database>,
  input: MediaInsert,
): Promise<Media> {
  const { data, error } = await supabase
    .from("media")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getMediaById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Media | null> {
  const { data, error } = await supabase
    .from("media")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getMediaByIds(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Media[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("media")
    .select("*")
    .in("id", ids);

  if (error) throw error;
  return data;
}

export async function deleteMedia(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) throw error;
}

export function publicMediaUrl(
  supabase: SupabaseClient<Database>,
  storagePath: string,
): string {
  return supabase.storage.from("media").getPublicUrl(storagePath).data
    .publicUrl;
}
