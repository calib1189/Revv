import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

export async function createAuditLog(
  supabase: SupabaseClient<Database>,
  input: {
    actorId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, Json>;
  },
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: input.actorId,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}

export async function listAuditLogs(
  supabase: SupabaseClient<Database>,
  limit = 50,
): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
