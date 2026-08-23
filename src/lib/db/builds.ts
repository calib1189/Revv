import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Build = Database["public"]["Tables"]["builds"]["Row"];

export async function getActiveBuild(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
): Promise<Build | null> {
  const { data, error } = await supabase
    .from("builds")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Vehicles get their build lazily, on first use (e.g. adding a mod). */
export async function getOrCreateActiveBuild(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
): Promise<Build> {
  const existing = await getActiveBuild(supabase, vehicleId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("builds")
    .insert({ vehicle_id: vehicleId, status: "active" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
