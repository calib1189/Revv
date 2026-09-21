"use server";

import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { saveSubscription, deleteSubscription } from "@/lib/db/push-subscriptions";
import {
  registerDevicePushToken,
  deleteDevicePushToken,
  hasDevicePushToken,
} from "@/lib/db/device-push-tokens";
import { isValidDeviceToken } from "@/lib/push/validation";

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

/** Attaches this device's APNs token to the signed-in user. Also called
 * silently on every app launch (a token can change, and the phone may
 * have changed hands), so it must be safe for a logged-out visitor:
 * it returns an error rather than throwing or redirecting. */
export async function registerDeviceTokenAction(token: string): Promise<{ error?: string }> {
  if (!isValidDeviceToken(token)) return { error: "That isn't a valid device token." };
  try {
    const { supabase } = await requireConfirmedUser();
    await registerDevicePushToken(supabase, token);
    return {};
  } catch {
    return { error: "Couldn't turn on notifications for this device." };
  }
}

export async function unregisterDeviceTokenAction(token: string): Promise<void> {
  if (!isValidDeviceToken(token)) return;
  try {
    const { supabase } = await requireConfirmedUser();
    await deleteDevicePushToken(supabase, token);
  } catch {
    // Nothing useful to tell the user: the worst case is a token that
    // lingers until APNs reports it dead, and then it's cleaned up.
  }
}

/** Whether THIS device's token is attached to THIS account. The settings
 * toggle asks the server rather than trusting the token remembered on the
 * device: that memory outlives a sign-out, so it would otherwise show
 * "on" for a different person who signed in on the same phone. */
export async function hasDeviceTokenAction(token: string): Promise<boolean> {
  if (!isValidDeviceToken(token)) return false;
  try {
    const { supabase, user } = await requireConfirmedUser();
    return await hasDevicePushToken(supabase, user.id, token);
  } catch {
    return false;
  }
}
