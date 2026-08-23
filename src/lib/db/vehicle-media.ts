import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Media } from "@/lib/db/media";

export type VehicleMedia = Database["public"]["Tables"]["vehicle_media"]["Row"];
export type VehicleMediaWithMedia = VehicleMedia & { media: Media };

export async function listVehicleMedia(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
): Promise<VehicleMediaWithMedia[]> {
  const { data, error } = await supabase
    .from("vehicle_media")
    .select("*, media(*)")
    .eq("vehicle_id", vehicleId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data as VehicleMediaWithMedia[];
}

export async function addVehicleMedia(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  mediaId: string,
  position: number,
): Promise<VehicleMedia> {
  const { data, error } = await supabase
    .from("vehicle_media")
    .insert({ vehicle_id: vehicleId, media_id: mediaId, position })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function removeVehicleMedia(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("vehicle_media").delete().eq("id", id);
  if (error) throw error;
}
