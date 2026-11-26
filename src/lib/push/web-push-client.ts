"use client";

import { subscribeToPushAction } from "@/features/push/push-actions";

/** Browser (Web Push) notifications: the website, and the Android app,
 * which is the website in Chrome (lib/native/android-app.ts). The iPhone
 * app uses APNs through lib/native/push.ts instead. */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) array[i] = raw.charCodeAt(i);
  return array;
}

export function webPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!VAPID_PUBLIC_KEY &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Where this browser stands: on (subscribed), off, denied, or unsupported. */
export async function webPushState(): Promise<"unsupported" | "denied" | "on" | "off"> {
  if (!webPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.register("/sw.js");
  return (await registration.pushManager.getSubscription()) ? "on" : "off";
}

/** Asks for permission (from inside a tap) and saves the subscription. */
export async function enableWebPush(): Promise<{ ok: true } | { ok: false; reason: "denied" | "error"; detail?: string }> {
  if (!webPushSupported()) return { ok: false, reason: "error", detail: "not supported" };
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
    });
    const json = subscription.toJSON();
    const result = await subscribeToPushAction({
      endpoint: json.endpoint!,
      keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
    });
    if (result.error) {
      await subscription.unsubscribe();
      return { ok: false, reason: "error", detail: result.error };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: "error", detail: err instanceof Error ? err.message : String(err) };
  }
}
