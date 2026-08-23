import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

/** Fire-and-forget: analytics must never break the feature it's attached
 * to, so failures are swallowed rather than thrown. */
export async function trackEvent(
  supabase: SupabaseClient<Database>,
  userId: string | null,
  name: string,
  props: Record<string, Json> = {},
): Promise<void> {
  try {
    await supabase.from("events").insert({ user_id: userId, name, props });
  } catch {
    // Never let analytics failures surface to the user.
  }
}
