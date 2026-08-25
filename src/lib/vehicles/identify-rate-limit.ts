import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function isUnderIdentifyRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  // Cast to the untyped client for this one call — same reason as
  // isUnderSignupRateLimit: the hand-written Database type has no
  // Functions map, and adding one just for this RPC destabilizes type
  // inference for the embedded media(*) selects elsewhere.
  const untyped = supabase as unknown as SupabaseClient;
  const { data, error } = await untyped.rpc("under_ai_identify_rate_limit", {
    p_user_id: userId,
  });
  if (error) return true; // fail open — never block real use over our own check erroring
  return Boolean(data);
}

export async function recordIdentifyAttempt(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  await supabase.from("ai_identify_attempts").insert({ user_id: userId });
}
