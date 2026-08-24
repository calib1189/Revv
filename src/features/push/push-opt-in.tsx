"use client";

import { useEffect, useState } from "react";
import { subscribeToPushAction, unsubscribeFromPushAction } from "@/features/push/push-actions";
import { Button } from "@/components/ui/button";
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

type Status = "loading" | "unsupported" | "denied" | "off" | "on";

export function PushOptIn() {
  const [status, setStatus] = useState<Status>("loading");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
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

  if (status === "loading" || status === "unsupported") return null;

  return (
    <div>
      {status === "denied" ? (
        <p className="text-sm text-muted">
          Notifications are blocked for this site — enable them in your browser
          settings to turn this on.
        </p>
      ) : status === "on" ? (
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={handleDisable}
          className="px-3 py-1.5 text-sm"
        >
          {isPending ? "Turning off…" : "Turn off push notifications"}
        </Button>
      ) : (
        <Button
          type="button"
          disabled={isPending}
          onClick={handleEnable}
          className="px-3 py-1.5 text-sm"
        >
          {isPending ? "Enabling…" : "Enable push notifications"}
        </Button>
      )}
      {error && (
        <div className="mt-2">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}
    </div>
  );
}
