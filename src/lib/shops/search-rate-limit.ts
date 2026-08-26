import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function isUnderShopsSearchRateLimit(
  supabase: SupabaseClient<Database>,
  ip: string,
): Promise<boolean> {
  const untyped = supabase as unknown as SupabaseClient;
  const { data, error } = await untyped.rpc("under_shops_search_rate_limit", { p_ip: ip });
  if (error) return true; // fail open — never block real browsing over our own check erroring
  return Boolean(data);
}

export async function recordShopsSearchAttempt(
  supabase: SupabaseClient<Database>,
  ip: string,
): Promise<void> {
  await supabase.from("shops_search_attempts").insert({ ip });
}
