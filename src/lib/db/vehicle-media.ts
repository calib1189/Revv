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

/** Which of these vehicles have at least one photo (not video) in their
 * gallery — with a cover photo, what the rating needs (see
 * generateBuildRatingAction). */
export async function listVehicleIdsWithGalleryPhotos(
  supabase: SupabaseClient<Database>,
  vehicleIds: string[],
): Promise<Set<string>> {
  if (vehicleIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("vehicle_media")
    .select("vehicle_id, media(kind)")
    .in("vehicle_id", vehicleIds);
  if (error) throw error;
  return new Set(
    (data as { vehicle_id: string; media: { kind: string } | null }[])
      .filter((row) => row.media?.kind === "image")
      .map((row) => row.vehicle_id),
  );
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

/** Moves a photo to the front of the gallery, which is what puts it in
 * the set the AI rates (lib/rating/rated-photos.ts). It takes a position
 * one before the current first, so nothing else has to be renumbered. */
export async function moveVehicleMediaToFront(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  id: string,
): Promise<void> {
  const { data: first, error: firstError } = await supabase
    .from("vehicle_media")
    .select("position")
    .eq("vehicle_id", vehicleId)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (firstError) throw firstError;
  // RLS turns an update the caller isn't allowed to make into "0 rows";
  // selecting the row back tells a real move from one that did nothing.
  const { data, error } = await supabase
    .from("vehicle_media")
    .update({ position: (first?.position ?? 0) - 1 })
    .eq("id", id)
    .eq("vehicle_id", vehicleId)
    .select("id");
  if (error) throw error;
  if (data.length === 0) throw new Error("Photo not moved.");
}

export async function removeVehicleMedia(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  // RLS turns a delete the caller isn't allowed to make into "0 rows",
  // not an error. Selecting the deleted row back is what tells a real
  // delete apart from one that silently did nothing.
  const { data, error } = await supabase.from("vehicle_media").delete().eq("id", id).select("id");
  if (error) throw error;
  if (data.length === 0) throw new Error("Photo not deleted.");
}
