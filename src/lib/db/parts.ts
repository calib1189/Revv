import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Part = Database["public"]["Tables"]["parts"]["Row"];

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
