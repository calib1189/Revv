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

/** Total gallery photo count across several vehicles at once — for
 * garage-wide achievement thresholds (see lib/achievements/unlock.ts),
 * where per-vehicle counts don't matter, only the sum. */
export async function countVehicleMediaForVehicles(
  supabase: SupabaseClient<Database>,
  vehicleIds: string[],
): Promise<number> {
  if (vehicleIds.length === 0) return 0;
  const { count, error } = await supabase
    .from("vehicle_media")
    .select("*", { count: "exact", head: true })
    .in("vehicle_id", vehicleIds);
  if (error) throw error;
  return count ?? 0;
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
