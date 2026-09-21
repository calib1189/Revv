import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getNativePushProvider } from "@/lib/providers/get-native-push-provider";
import { deleteDevicePushTokens, listDevicePushTokensForUser } from "@/lib/db/device-push-tokens";
import type { PushPayload } from "@/lib/push/payload";

export type { PushPayload } from "@/lib/push/payload";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

function isWebPushConfigured(): boolean {
  return Boolean(publicKey && privateKey);
}

if (isWebPushConfigured()) {
  webpush.setVapidDetails("mailto:contact@sorza.net", publicKey!, privateKey!);
}

async function sendWebPush(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!isWebPushConfigured()) return;

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);
  if (error || !subscriptions?.length) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );
}

/** The iOS app's devices. A WKWebView has no Web Push, so a person using
 * the App Store build is invisible to sendWebPush above no matter how
 * many notifications they enable — they need APNs. */
async function sendNativePush(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: PushPayload,
): Promise<void> {
  const tokens = await listDevicePushTokensForUser(supabase, userId);
  if (tokens.length === 0) return;

  const { invalidTokens } = await getNativePushProvider().send(tokens, payload);
  // Only tokens APNs itself reported dead are removed — see
  // classifyApnsResponse for why that distinction matters.
  await deleteDevicePushTokens(supabase, invalidTokens);
}

/** Sends a push to every device `userId` has opted in on — browsers via
 * Web Push, the iOS app via APNs. Best-effort throughout: a channel that
 * is unconfigured, or one send failing (expired, revoked, offline), never
 * throws and never stops the other channel. Callers fire this from inside
 * the action that caused the notification (a like, a message), and a
 * notification failing to deliver must not fail the like. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    await Promise.allSettled([
      sendWebPush(supabase, userId, payload),
      sendNativePush(supabase, userId, payload),
    ]);
  } catch {
    // Most likely the service-role client couldn't be built (no key in
    // this environment). Same "silently does nothing when not set up"
    // behaviour this function has always had.
  }
}
