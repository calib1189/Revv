import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Part = Database["public"]["Tables"]["parts"]["Row"];
export type PartInsert = Database["public"]["Tables"]["parts"]["Insert"];
export type PartUpdate = Database["public"]["Tables"]["parts"]["Update"];

export async function searchParts(
  supabase: SupabaseClient<Database>,
  query: string,
  limit = 10,
): Promise<Part[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase
    .from("parts")
    .select("*")
    .or(`brand.ilike.%${trimmed}%,product.ilike.%${trimmed}%`)
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function browseParts(
  supabase: SupabaseClient<Database>,
  { category, limit = 24 }: { category?: string; limit?: number } = {},
): Promise<Part[]> {
  let query = supabase.from("parts").select("*").order("brand").limit(limit);
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getPartById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Part | null> {
  const { data, error } = await supabase
    .from("parts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPartsByIds(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Part[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("parts")
    .select("*")
    .in("id", ids);

  if (error) throw error;
  return data;
}

/** Admin catalog management — RLS restricts insert/update/delete on
 * `parts` to is_admin profiles (0036), so these are only reachable
 * through an action that's already called requireAdmin(). */
export async function listAllParts(
  supabase: SupabaseClient<Database>,
  limit = 200,
): Promise<Part[]> {
  const { data, error } = await supabase
    .from("parts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function createPart(
  supabase: SupabaseClient<Database>,
  input: PartInsert,
): Promise<Part> {
  const { data, error } = await supabase
    .from("parts")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updatePart(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: PartUpdate,
): Promise<Part> {
  const { data, error } = await supabase
    .from("parts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deletePart(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("parts").delete().eq("id", id);
  if (error) throw error;
}
