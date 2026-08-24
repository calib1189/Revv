import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function isUnderSignupRateLimit(
  supabase: SupabaseClient<Database>,
  ip: string,
): Promise<boolean> {
  // Cast to the untyped client for this one call — the generated
  // Database type doesn't have a Functions map (see its own file header:
  // hand-written, not `supabase gen types`), and adding one just for this
  // RPC destabilizes type inference for the embedded `media(*)` selects
  // elsewhere that rely on the same generic parameter.
  const untyped = supabase as unknown as SupabaseClient;
  const { data, error } = await untyped.rpc("under_signup_rate_limit", { p_ip: ip });
  if (error) return true; // fail open — never block a real signup over our own check erroring
  return Boolean(data);
}

export async function recordSignupAttempt(
  supabase: SupabaseClient<Database>,
  ip: string,
): Promise<void> {
  await supabase.from("signup_attempts").insert({ ip });
}
