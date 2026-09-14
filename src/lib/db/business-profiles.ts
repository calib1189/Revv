import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type BusinessProfile = Database["public"]["Tables"]["business_profiles"]["Row"];
export type BusinessProfileInsert = Database["public"]["Tables"]["business_profiles"]["Insert"];

export async function createBusinessProfile(
  supabase: SupabaseClient<Database>,
  input: BusinessProfileInsert,
): Promise<BusinessProfile> {
  const { data, error } = await supabase
    .from("business_profiles")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getBusinessProfileById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<BusinessProfile | null> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** RLS decides what comes back here, not this function — an anonymous or
 * unrelated caller only ever gets the row if it's approved, while the
 * owner (or an admin) sees it regardless of status. Same row, different
 * visibility per caller, exactly like ownership_verification_status. */
export async function getBusinessProfileByPlaceId(
  supabase: SupabaseClient<Database>,
  placeId: string,
): Promise<BusinessProfile | null> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("place_id", placeId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listBusinessProfilesByOwner(
  supabase: SupabaseClient<Database>,
  ownerId: string,
): Promise<BusinessProfile[]> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateBusinessProfile(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<
    Pick<BusinessProfile, "description" | "logo_media_id" | "verification_media_id" | "verification_status">
  >,
): Promise<void> {
  const { error } = await supabase.from("business_profiles").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteBusinessProfile(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("business_profiles").delete().eq("id", id);
  if (error) throw error;
}

export async function listPendingBusinessVerifications(
  supabase: SupabaseClient<Database>,
): Promise<BusinessProfile[]> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}
