import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Crew = Database["public"]["Tables"]["crews"]["Row"];
export type CrewInsert = Database["public"]["Tables"]["crews"]["Insert"];
export type CrewUpdate = Database["public"]["Tables"]["crews"]["Update"];

/** Public crews for the discover page, most recently created first. RLS
 * already hides private crews from a non-member here — this filter is
 * just belt-and-suspenders so the query is correct on its own terms. */
export async function listPublicCrews(
  supabase: SupabaseClient<Database>,
  { before, limit = 24 }: { before?: string; limit?: number } = {},
): Promise<Crew[]> {
  let query = supabase
    .from("crews")
    .select("*")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getCrewById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Crew | null> {
  const { data, error } = await supabase.from("crews").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Batch lookup for hydrating "your crews" from a list of ids — guards
 * empty input first, same convention as getProfilesByIds. */
export async function getCrewsByIds(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Crew[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("crews").select("*").in("id", ids);
  if (error) throw error;
  return data;
}

export async function createCrew(
  supabase: SupabaseClient<Database>,
  input: CrewInsert,
): Promise<Crew> {
  const { data, error } = await supabase.from("crews").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

/** RLS ("owners manage their own crews", 0064) is the only thing
 * enforcing ownership here — same convention as updatePostCaption. */
export async function updateCrew(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: CrewUpdate,
): Promise<void> {
  const { error } = await supabase.from("crews").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCrew(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const { error } = await supabase.from("crews").delete().eq("id", id);
  if (error) throw error;
}
