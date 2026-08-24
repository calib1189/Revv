import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

function isConfigured(): boolean {
  return Boolean(publicKey && privateKey);
}

if (isConfigured()) {
  webpush.setVapidDetails("mailto:calib1189@gmail.com", publicKey!, privateKey!);
}

export interface PushPayload {
  title: string;
  body: string;
  /** Path to open when the notification is tapped, e.g. "/p/123". */
  url: string;
}

/** Sends a push to every device `userId` has opted in on. Best-effort:
 * an individual subscription failing (expired, revoked) never throws —
 * it's just deleted so we stop wasting sends on it. Silently does nothing
 * if VAPID keys aren't configured, same "disabled until env is set"
 * pattern as billing. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!isConfigured()) return;

  const supabase = createServiceRoleClient();
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
