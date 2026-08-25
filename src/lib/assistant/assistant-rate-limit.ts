import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function isUnderAssistantRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const untyped = supabase as unknown as SupabaseClient;
  const { data, error } = await untyped.rpc("under_ai_assistant_rate_limit", {
    p_user_id: userId,
  });
  if (error) return true; // fail open — never block real use over our own check erroring
  return Boolean(data);
}

export async function recordAssistantMessage(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  await supabase.from("ai_assistant_messages").insert({ user_id: userId });
}
