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

export async function listPartCategories(
  supabase: SupabaseClient<Database>,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("parts")
    .select("category")
    .not("category", "is", null);

  if (error) throw error;
  return [...new Set(data.map((row) => row.category as string))].sort();
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
