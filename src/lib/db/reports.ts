import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];

export async function createReport(
  supabase: SupabaseClient<Database>,
  input: ReportInsert,
): Promise<void> {
  const { error } = await supabase.from("reports").insert(input);
  if (error) throw error;
}
