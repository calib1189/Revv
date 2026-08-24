"use server";

import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { saveSubscription, deleteSubscription } from "@/lib/db/push-subscriptions";

export async function subscribeToPushAction(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await requireConfirmedUser();
    await saveSubscription(supabase, user.id, {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
    return {};
  } catch {
    return { error: "Couldn't save that subscription." };
  }
}

export async function unsubscribeFromPushAction(endpoint: string): Promise<void> {
  const { supabase } = await requireConfirmedUser();
  await deleteSubscription(supabase, endpoint);
}
