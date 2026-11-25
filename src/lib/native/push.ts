"use client";

import type { PushNotificationsPlugin } from "@capacitor/push-notifications";
import {
  registerDeviceTokenAction,
  reportPushRegistrationFailureAction,
  unregisterDeviceTokenAction,
} from "@/features/push/push-actions";

// Everything about the iOS app's push registration that needs the
// Capacitor plugin. Dynamically imported, like the rest of the native
// bridge, so none of it reaches the ordinary web bundle.

const TOKEN_STORAGE_KEY = "sorza.pushToken";
const REGISTRATION_TIMEOUT_MS = 15_000;

export type NativePushPermission = "granted" | "denied" | "prompt";

export function readStoredPushToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storePushToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Private mode / blocked storage. The token still reached the
    // server; the only thing lost is the ability to remove it on
    // sign-out, and a stale token is cleaned up when APNs rejects it.
  }
}

// Returns the plugin INSIDE a plain object, never bare. A Capacitor plugin
// is a Proxy that answers every property lookup with a method that calls
// into native code — including `then`. An async function that returns the
// plugin itself makes JavaScript treat it as a thenable and call its
// `then`, which asks iOS for a method literally named "then", gets
// nothing back, and never resolves — so `await loadPlugin()` hung forever
// on a real device (and only there: on the web this returns null). That
// silently froze every call below, the settings switch included, and
// anything awaiting them at startup. Wrapping it in `{ plugin }` keeps it
// out of the promise machinery.
async function loadPlugin(): Promise<{ plugin: PushNotificationsPlugin } | null> {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return null;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  return { plugin: PushNotifications };
}

export async function isNativeApp(): Promise<boolean> {
  const { Capacitor } = await import("@capacitor/core");
  return Capacitor.isNativePlatform();
}

/** Whether this copy of the app has the push plugin at all. 1.0.1 and
 * 1.1 shipped without it, so on those iOS answers "not implemented" and
 * the only fix is updating the app. */
export async function isNativePushAvailable(): Promise<boolean> {
  const { Capacitor } = await import("@capacitor/core");
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("PushNotifications");
}

export async function getNativePushPermission(): Promise<NativePushPermission> {
  const loaded = await loadPlugin();
  if (!loaded) return "denied";
  const { plugin } = loaded;
  const { receive } = await plugin.checkPermissions();
  if (receive === "granted") return "granted";
  if (receive === "denied") return "denied";
  return "prompt";
}

type EnableResult = { ok: true } | { ok: false; reason: "denied" } | { ok: false; reason: "failed"; detail: string };

let enabling: Promise<EnableResult> | null = null;

/** Asks iOS for permission (once — after a refusal iOS never shows the
 * prompt again, and the person has to use Settings), gets an APNs token,
 * and attaches it to the signed-in account. Calls made while one is
 * already running share it — the app-open prompt and the "turn on
 * notifications" page can both ask at the same moment. */
export function enableNativePush(): Promise<EnableResult> {
  enabling ??= enableNativePushOnce().finally(() => {
    enabling = null;
  });
  return enabling;
}

async function enableNativePushOnce(): Promise<EnableResult> {
  const loaded = await loadPlugin();
  if (!loaded) return { ok: false, reason: "failed", detail: "plugin unavailable" };
  const { plugin } = loaded;

  const permission = await plugin.requestPermissions();
  if (permission.receive !== "granted") return { ok: false, reason: "denied" };

  const outcome = await new Promise<{ token: string } | { error: string }>((resolve) => {
    const handles: { remove: () => Promise<void> }[] = [];
    const done = (value: { token: string } | { error: string }) => {
      clearTimeout(timer);
      handles.forEach((h) => void h.remove());
      resolve(value);
    };
    // register() resolves before the token exists; the token arrives on
    // an event, and a failure arrives on another. Without a timeout, a
    // network where APNs is unreachable leaves the toggle spinning
    // forever with nothing to say why.
    const timer = setTimeout(() => done({ error: "timed out waiting for iOS" }), REGISTRATION_TIMEOUT_MS);

    void (async () => {
      handles.push(await plugin.addListener("registration", (t) => done({ token: t.value })));
      handles.push(
        await plugin.addListener("registrationError", (e) => done({ error: `iOS: ${e.error}` })),
      );
      await plugin.register();
    })().catch((err: unknown) => done({ error: `register threw: ${errorText(err)}` }));
  });
  if ("error" in outcome) return failed(outcome.error);
  const { token } = outcome;

  const result = await registerDeviceTokenAction(token);
  if (result.error) return failed(`server: ${result.detail ?? result.error}`);

  storePushToken(token);
  return { ok: true };
}

export async function disableNativePush(): Promise<void> {
  const token = readStoredPushToken();
  if (token) await unregisterDeviceTokenAction(token);
  storePushToken(null);
  const loaded = await loadPlugin();
  // Stops the device receiving remote notifications for this app.
  // iOS permission itself can't be revoked from code — only from Settings.
  await loaded?.plugin.unregister().catch(() => {});
}

/** Called once per app launch. If notifications were already allowed,
 * re-registers so the server always holds the CURRENT token: APNs may
 * rotate it, an app reinstall issues a new one, and a phone that changed
 * hands needs its token reassigned to whoever is signed in now.
 *
 * Never prompts itself — asking is PushPrompt's job (the one-time sheet
 * that asks before iOS does), with the Notifications settings screen and
 * the streak card's nudge after that. */
export async function refreshNativePushRegistration(): Promise<void> {
  const loaded = await loadPlugin();
  if (!loaded) return;
  const { plugin } = loaded;
  const { receive } = await plugin.checkPermissions();
  if (receive !== "granted") return;

  await plugin.addListener("registration", (t) => {
    storePushToken(t.value);
    void registerDeviceTokenAction(t.value).then((result) => {
      // A signed-out launch is expected to fail; anything else is worth knowing.
      if (result.error && result.detail !== "You must be logged in.") {
        reportFailure("refresh", `server: ${result.detail ?? result.error}`);
      }
    });
  });
  await plugin.addListener("registrationError", (e) => reportFailure("refresh", `iOS: ${e.error}`));
  await plugin.register();
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Push registration fails silently on a real phone, where nobody can see
 * the console, so the reason is recorded where it can be read: the events
 * table, as push_register_failed. Fire-and-forget. */
function reportFailure(stage: "enable" | "refresh", detail: string) {
  void reportPushRegistrationFailureAction(stage, detail).catch(() => {});
}

function failed(detail: string): { ok: false; reason: "failed"; detail: string } {
  reportFailure("enable", detail);
  return { ok: false, reason: "failed", detail };
}

/** Wires a tapped notification to navigation. `open` receives only a
 * path that passed isSafeAppPath. */
export async function listenForNotificationTaps(
  open: (path: string) => void,
  isSafePath: (value: unknown) => value is string,
): Promise<{ remove: () => void } | null> {
  const loaded = await loadPlugin();
  if (!loaded) return null;
  const { plugin } = loaded;
  const handle = await plugin.addListener("pushNotificationActionPerformed", (action) => {
    const url = (action.notification.data as { url?: unknown } | undefined)?.url;
    if (isSafePath(url)) open(url);
  });
  return { remove: () => void handle.remove() };
}
