import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type MaintenanceRecord = Database["public"]["Tables"]["maintenance"]["Row"];
export type MaintenanceInsert = Database["public"]["Tables"]["maintenance"]["Insert"];
export type MaintenanceUpdate = Database["public"]["Tables"]["maintenance"]["Update"];

export async function listMaintenanceForVehicle(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
): Promise<MaintenanceRecord[]> {
  const { data, error } = await supabase
    .from("maintenance")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("performed_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createMaintenanceRecord(
  supabase: SupabaseClient<Database>,
  input: MaintenanceInsert,
): Promise<MaintenanceRecord> {
  const { data, error } = await supabase
    .from("maintenance")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateMaintenanceRecord(
  supabase: SupabaseClient<Database>,
  id: string,
  input: MaintenanceUpdate,
): Promise<MaintenanceRecord> {
  const { data, error } = await supabase
    .from("maintenance")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMaintenanceRecord(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("maintenance").delete().eq("id", id);
  if (error) throw error;
}
