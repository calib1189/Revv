"use server";

import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { saveSubscription, deleteSubscription } from "@/lib/db/push-subscriptions";
import {
  registerDevicePushToken,
  deleteDevicePushToken,
  deleteDevicePushTokens,
  hasDevicePushToken,
  listDevicePushTokensForUser,
} from "@/lib/db/device-push-tokens";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getNativePushProvider } from "@/lib/providers/get-native-push-provider";
import { isValidDeviceToken } from "@/lib/push/validation";
import { isPushCategory, setNotificationPreference, setQuietHours, setTimeZone } from "@/lib/db/notification-preferences";

// Long enough to lock the phone, short enough not to feel broken.
const TEST_PUSH_DELAY_MS = 5_000;

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

export type TestPushResult =
  | { status: "not-configured" }
  | { status: "no-device" }
  | { status: "sent" }
  | { status: "rejected"; reasons: string[] }
  | { status: "error"; detail: string };

/** Sends one notification to the signed-in person's own devices and says
 * which step failed if it can't. Push fails silently by design everywhere
 * else (a like must never fail because a notification did), which makes
 * "I never got one" impossible to diagnose from outside — this is the one
 * place that reports what actually happened. Only ever targets the
 * caller's own account, with fixed text. */
export async function sendTestPushAction(): Promise<TestPushResult> {
  try {
    const { user } = await requireConfirmedUser();

    const provider = getNativePushProvider();
    if (provider.isMock) return { status: "not-configured" };

    const service = createServiceRoleClient();
    const tokens = await listDevicePushTokensForUser(service, user.id);
    if (tokens.length === 0) return { status: "no-device" };

    // iOS shows nothing for a notification that arrives while SORZA is
    // open, and this button is always pressed inside the app. The wait
    // gives the person time to lock the phone or switch apps so the test
    // arrives the way a real one would. It runs here, not on the phone,
    // because a backgrounded app's timers are paused.
    await new Promise((resolve) => setTimeout(resolve, TEST_PUSH_DELAY_MS));

    const { invalidTokens, failureReasons } = await provider.send(tokens, {
      title: "SORZA",
      body: "Notifications are working.",
      url: "/settings/notifications",
    });
    await deleteDevicePushTokens(service, invalidTokens);

    if (failureReasons.length > 0) return { status: "rejected", reasons: failureReasons };
    return { status: "sent" };
  } catch (err) {
    // e.g. the APNs key can't be parsed — the Node message names the
    // problem (key format) and contains nothing secret.
    return { status: "error", detail: err instanceof Error ? err.message.slice(0, 120) : "unknown" };
  }
}

/** Switches one kind of push notification on or off for the signed-in
 * person (Settings → Notifications). RLS (0094) keeps it to their row. */
export async function setNotificationPreferenceAction(
  category: string,
  enabled: boolean,
): Promise<{ error?: string }> {
  if (!isPushCategory(category)) return { error: "That isn't a notification type." };
  try {
    const { supabase, user } = await requireConfirmedUser();
    await setNotificationPreference(supabase, user.id, category, enabled);
    return {};
  } catch {
    return { error: "Couldn't save that. Try again." };
  }
}

/** Saves quiet hours (0106). Hours are local to the person's device. */
export async function setQuietHoursAction(input: {
  enabled: boolean;
  start: number;
  end: number;
}): Promise<{ error?: string }> {
  const valid = (h: number) => Number.isInteger(h) && h >= 0 && h <= 23;
  if (!valid(input.start) || !valid(input.end)) return { error: "Pick a start and end time." };
  try {
    const { supabase, user } = await requireConfirmedUser();
    await setQuietHours(supabase, user.id, input);
    return {};
  } catch {
    return { error: "Couldn't save that. Try again." };
  }
}

/** Remembers the device's time zone, so quiet hours and morning/evening
 * notifications land at the right local time. */
export async function saveTimeZoneAction(timeZone: string): Promise<void> {
  if (!timeZone || timeZone.length > 64) return;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    return;
  }
  try {
    const { supabase, user } = await requireConfirmedUser();
    await setTimeZone(supabase, user.id, timeZone);
  } catch {
    // Best-effort: notifications fall back to Central time.
  }
}
