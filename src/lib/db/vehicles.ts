import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type VehicleInsert = Database["public"]["Tables"]["vehicles"]["Insert"];
export type VehicleUpdate = Database["public"]["Tables"]["vehicles"]["Update"];

export async function listVehiclesByOwner(
  supabase: SupabaseClient<Database>,
  ownerId: string,
): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function listVehiclesByIds(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Vehicle[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase.from("vehicles").select("*").in("id", ids);
  if (error) throw error;
  return data;
}

export async function getVehicleById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createVehicle(
  supabase: SupabaseClient<Database>,
  input: VehicleInsert,
): Promise<Vehicle> {
  const { data, error } = await supabase
    .from("vehicles")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateVehicle(
  supabase: SupabaseClient<Database>,
  id: string,
  input: VehicleUpdate,
): Promise<Vehicle> {
  const { data, error } = await supabase
    .from("vehicles")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVehicle(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
}
