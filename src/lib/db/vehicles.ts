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

export async function listVehiclesByOwnerIds(
  supabase: SupabaseClient<Database>,
  ownerIds: string[],
): Promise<Vehicle[]> {
  if (ownerIds.length === 0) return [];

  const { data, error } = await supabase.from("vehicles").select("*").in("owner_id", ownerIds);
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

/** Vehicle ids in a given category — used to filter the leaderboard down
 * to one category without a Postgres-side join, so it doesn't depend on
 * PostgREST's embedded-resource relationship cache staying in sync. */
export async function listVehicleIdsByCategory(
  supabase: SupabaseClient<Database>,
  category: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("id")
    .eq("category", category);

  if (error) throw error;
  return data.map((v) => v.id);
}

/** Vehicle ids with an admin-approved ownership verification photo — the
 * leaderboard's eligibility gate, filtered the same way
 * listVehicleIdsByCategory is (a plain id list, not a Postgres-side
 * join) for the same reason: it doesn't depend on PostgREST's
 * embedded-resource relationship cache staying in sync. */
export async function listVerifiedVehicleIds(
  supabase: SupabaseClient<Database>,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("id")
    .eq("ownership_verification_status", "approved");

  if (error) throw error;
  return data.map((v) => v.id);
}

/** Vehicles currently awaiting admin review — the ownership-verification
 * queue's source list. */
export async function listPendingVerifications(
  supabase: SupabaseClient<Database>,
): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("ownership_verification_status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

/** Vehicle ids for the sitemap — every vehicle is publicly readable (see
 * 0001_init.sql's RLS policy). A plain id list rather than a Postgres-
 * side join to profiles (same reasoning as listVehicleIdsByCategory
 * above: doesn't depend on PostgREST's embedded-resource relationship
 * cache staying in sync) — banned owners are filtered out by the
 * caller, which already needs the owner id to build the banned-set once
 * for vehicles and posts together. Capped and ordered by recency rather
 * than listing every vehicle ever created, since an unbounded sitemap
 * is its own problem once the app has real scale. */
export async function listSitemapVehicles(
  supabase: SupabaseClient<Database>,
  limit = 5000,
): Promise<{ id: string; ownerId: string; createdAt: string }[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, owner_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data.map((v) => ({ id: v.id, ownerId: v.owner_id, createdAt: v.created_at }));
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
