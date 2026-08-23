import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type BuildPart = Database["public"]["Tables"]["build_parts"]["Row"];
export type BuildPartInsert =
  Database["public"]["Tables"]["build_parts"]["Insert"];
export type BuildPartUpdate =
  Database["public"]["Tables"]["build_parts"]["Update"];

export async function listBuildParts(
  supabase: SupabaseClient<Database>,
  buildId: string,
): Promise<BuildPart[]> {
  const { data, error } = await supabase
    .from("build_parts")
    .select("*")
    .eq("build_id", buildId)
    .order("installed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createBuildPart(
  supabase: SupabaseClient<Database>,
  input: BuildPartInsert,
): Promise<BuildPart> {
  const { data, error } = await supabase
    .from("build_parts")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateBuildPart(
  supabase: SupabaseClient<Database>,
  id: string,
  input: BuildPartUpdate,
): Promise<BuildPart> {
  const { data, error } = await supabase
    .from("build_parts")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBuildPart(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("build_parts").delete().eq("id", id);
  if (error) throw error;
}
