"use client";

import { useEffect, useState } from "react";
import {
  subscribeToPushAction,
  unsubscribeFromPushAction,
  hasDeviceTokenAction,
} from "@/features/push/push-actions";
import {
  isNativeApp,
  getNativePushPermission,
  enableNativePush,
  disableNativePush,
  readStoredPushToken,
} from "@/lib/native/push";
import { Toggle } from "@/components/ui/toggle";
import { Spinner } from "@/components/ui/spinner";
import { Callout } from "@/components/ui/callout";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const array = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    array[i] = rawData.charCodeAt(i);
  }
  return array;
}

type Status = "loading" | "unsupported" | "ios-needs-install" | "denied" | "off" | "on";

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  // iOS Safari exposes this non-standard property instead of matching
  // display-mode: standalone the way other browsers do.
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PushOptIn() {
  const [status, setStatus] = useState<Status>("loading");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The App Store build is a WKWebView, which has no Web Push at all —
  // there the toggle drives APNs through the native plugin instead.
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    (async () => {
      if (await isNativeApp()) {
        setIsNative(true);
        const permission = await getNativePushPermission();
        if (permission === "denied") {
          setStatus("denied");
          return;
        }
        // Ask the server, not localStorage: the remembered token
        // survives a sign-out, so trusting it would show "on" for a
        // different person who signed in on the same phone.
        const token = readStoredPushToken();
        const attached = permission === "granted" && token ? await hasDeviceTokenAction(token) : false;
        setStatus(attached ? "on" : "off");
        return;
      }
      if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus(isIos() && !isStandalone() ? "ios-needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? "on" : "off");
    })();
  }, []);

  async function handleEnable() {
    setError(null);
    setIsPending(true);
    if (isNative) {
      try {
        const result = await enableNativePush();
        if (result.ok) setStatus("on");
        else if (result.reason === "denied") setStatus("denied");
        else setError("Couldn't enable notifications. Check your connection and try again.");
      } catch {
        setError("Couldn't enable notifications. Try again.");
      } finally {
        setIsPending(false);
      }
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
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
        setError(result.error);
        await subscription.unsubscribe();
        return;
      }
      setStatus("on");
    } catch {
      setError("Couldn't enable notifications. Try again.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDisable() {
    setError(null);
    setIsPending(true);
    if (isNative) {
      try {
        await disableNativePush();
        setStatus("off");
      } catch {
        setError("Couldn't turn off notifications. Try again.");
      } finally {
        setIsPending(false);
      }
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPushAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("Couldn't turn off notifications. Try again.");
    } finally {
      setIsPending(false);
    }
  }

  const footer =
    status === "ios-needs-install"
      ? "On iPhone, add SORZA to your Home Screen first: tap Share, then Add to Home Screen. Open it from there to turn this on."
      : status === "denied"
        ? isNative
          ? "Notifications are turned off for SORZA. Open the Settings app, tap SORZA, then Notifications, and allow them."
          : "Notifications are blocked for this site. Allow them in your browser settings to turn this on."
        : status === "unsupported"
          ? "This browser doesn't support push notifications."
          : "Likes, comments, new followers, and messages.";

  return (
    <div>
      <div className="glass-raised elev-1 flex min-h-[52px] items-center gap-3 rounded-[22px] px-4 py-2.5">
        <span className="min-w-0 flex-1 text-[0.9375rem]">Push Notifications</span>
        {status === "loading" ? (
          <Spinner className="h-5 w-5 text-muted" />
        ) : (
          <Toggle
            label="Push notifications"
            checked={status === "on"}
            disabled={isPending || status === "unsupported" || status === "denied" || status === "ios-needs-install"}
            onChange={(next) => (next ? handleEnable() : handleDisable())}
          />
        )}
      </div>
      <p className="mt-2 px-4 text-[0.8125rem] leading-snug text-muted">{footer}</p>
      {error && (
        <div className="mt-3">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}
    </div>
  );
}
