import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

export async function getSubscriptionForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
