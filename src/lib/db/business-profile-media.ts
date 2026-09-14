import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Media } from "@/lib/db/media";

export type BusinessProfileMedia = Database["public"]["Tables"]["business_profile_media"]["Row"];
export type BusinessProfileMediaWithMedia = BusinessProfileMedia & { media: Media };

export async function listBusinessProfileMedia(
  supabase: SupabaseClient<Database>,
  businessProfileId: string,
): Promise<BusinessProfileMediaWithMedia[]> {
  const { data, error } = await supabase
    .from("business_profile_media")
    .select("*, media(*)")
    .eq("business_profile_id", businessProfileId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data as BusinessProfileMediaWithMedia[];
}

export async function addBusinessProfileMedia(
  supabase: SupabaseClient<Database>,
  businessProfileId: string,
  mediaId: string,
  position: number,
): Promise<BusinessProfileMedia> {
  const { data, error } = await supabase
    .from("business_profile_media")
    .insert({ business_profile_id: businessProfileId, media_id: mediaId, position })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function removeBusinessProfileMedia(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("business_profile_media").delete().eq("id", id);
  if (error) throw error;
}
