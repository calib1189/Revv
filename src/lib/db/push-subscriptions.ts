import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type PushSubscriptionRow = Database["public"]["Tables"]["push_subscriptions"]["Row"];

export async function saveSubscription(
  supabase: SupabaseClient<Database>,
  userId: string,
  subscription: { endpoint: string; p256dh: string; auth: string },
): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
      { onConflict: "endpoint" },
    );
  if (error) throw error;
}

export async function deleteSubscription(
  supabase: SupabaseClient<Database>,
  endpoint: string,
): Promise<void> {
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw error;
}

export async function hasSubscription(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("push_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function listSubscriptionsForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<PushSubscriptionRow[]> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}
