import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];

export async function createReport(
  supabase: SupabaseClient<Database>,
  input: ReportInsert,
): Promise<void> {
  const { error } = await supabase.from("reports").insert(input);
  if (error) throw error;
}

/** Admin-only in practice — RLS only lets admins see reports that
 * aren't their own. */
export async function listOpenReports(
  supabase: SupabaseClient<Database>,
): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateReportStatus(
  supabase: SupabaseClient<Database>,
  id: string,
  status: Report["status"],
): Promise<void> {
  const { error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
