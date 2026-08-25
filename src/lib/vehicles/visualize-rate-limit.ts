import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function isUnderVisualizeRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const untyped = supabase as unknown as SupabaseClient;
  const { data, error } = await untyped.rpc("under_ai_visualize_rate_limit", {
    p_user_id: userId,
  });
  if (error) return true; // fail open — never block real use over our own check erroring
  return Boolean(data);
}

export async function recordVisualizeAttempt(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  await supabase.from("ai_visualize_attempts").insert({ user_id: userId });
}
