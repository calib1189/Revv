import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Hotspot = Database["public"]["Tables"]["post_hotspots"]["Row"];
export type HotspotInsert =
  Database["public"]["Tables"]["post_hotspots"]["Insert"];

export async function listHotspotsForMedia(
  supabase: SupabaseClient<Database>,
  mediaIds: string[],
): Promise<Hotspot[]> {
  if (mediaIds.length === 0) return [];
  const { data, error } = await supabase
    .from("post_hotspots")
    .select("*")
    .in("media_id", mediaIds);

  if (error) throw error;
  return data;
}

export async function createHotspot(
  supabase: SupabaseClient<Database>,
  input: HotspotInsert,
): Promise<Hotspot> {
  const { data, error } = await supabase
    .from("post_hotspots")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHotspot(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("post_hotspots").delete().eq("id", id);
  if (error) throw error;
}
