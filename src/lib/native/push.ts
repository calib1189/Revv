"use client";

import {
  registerDeviceTokenAction,
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

async function loadPlugin() {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return null;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  return PushNotifications;
}

export async function isNativeApp(): Promise<boolean> {
  const { Capacitor } = await import("@capacitor/core");
  return Capacitor.isNativePlatform();
}

export async function getNativePushPermission(): Promise<NativePushPermission> {
  const plugin = await loadPlugin();
  if (!plugin) return "denied";
  const { receive } = await plugin.checkPermissions();
  if (receive === "granted") return "granted";
  if (receive === "denied") return "denied";
  return "prompt";
}

/** Asks iOS for permission (once — after a refusal iOS never shows the
 * prompt again, and the person has to use Settings), gets an APNs token,
 * and attaches it to the signed-in account. */
export async function enableNativePush(): Promise<
  { ok: true } | { ok: false; reason: "denied" | "failed" }
> {
  const plugin = await loadPlugin();
  if (!plugin) return { ok: false, reason: "failed" };

  const permission = await plugin.requestPermissions();
  if (permission.receive !== "granted") return { ok: false, reason: "denied" };

  const token = await new Promise<string | null>((resolve) => {
    const handles: { remove: () => Promise<void> }[] = [];
    const done = (value: string | null) => {
      clearTimeout(timer);
      handles.forEach((h) => void h.remove());
      resolve(value);
    };
    // register() resolves before the token exists; the token arrives on
    // an event, and a failure arrives on another. Without a timeout, a
    // network where APNs is unreachable leaves the toggle spinning
    // forever with nothing to say why.
    const timer = setTimeout(() => done(null), REGISTRATION_TIMEOUT_MS);

    void (async () => {
      handles.push(await plugin.addListener("registration", (t) => done(t.value)));
      handles.push(await plugin.addListener("registrationError", () => done(null)));
      await plugin.register();
    })().catch(() => done(null));
  });
  if (!token) return { ok: false, reason: "failed" };

  const result = await registerDeviceTokenAction(token);
  if (result.error) return { ok: false, reason: "failed" };

  storePushToken(token);
  return { ok: true };
}

export async function disableNativePush(): Promise<void> {
  const token = readStoredPushToken();
  if (token) await unregisterDeviceTokenAction(token);
  storePushToken(null);
  const plugin = await loadPlugin();
  // Stops the device receiving remote notifications for this app.
  // iOS permission itself can't be revoked from code — only from Settings.
  await plugin?.unregister().catch(() => {});
}

/** The first-open "Allow notifications?" prompt. Only fires while the
 * permission is still undecided — iOS reports "prompt" until the person
 * has answered once, and never shows the system dialog a second time, so
 * this can't nag. Called once someone is signed in rather than at the
 * very first frame: the device token has to be attached to an account to
 * be of any use, and a signed-out first launch would just get a token
 * nothing could be sent to. Best-effort — a failure here only means the
 * Notifications settings screen is still there to turn it on. */
export async function promptForNativePushIfNeverAsked(): Promise<void> {
  try {
    const plugin = await loadPlugin();
    if (!plugin) return;
    const { receive } = await plugin.checkPermissions();
    if (receive !== "prompt") return;
    await enableNativePush();
  } catch {
    // intentionally silent
  }
}

/** Called once per app launch. If notifications were already allowed,
 * re-registers so the server always holds the CURRENT token: APNs may
 * rotate it, an app reinstall issues a new one, and a phone that changed
 * hands needs its token reassigned to whoever is signed in now.
 *
 * Never prompts itself — the first-open prompt is
 * promptForNativePushIfNeverAsked, and the Notifications settings screen
 * remains the way to turn it on after an earlier refusal. */
export async function refreshNativePushRegistration(): Promise<void> {
  const plugin = await loadPlugin();
  if (!plugin) return;
  const { receive } = await plugin.checkPermissions();
  if (receive !== "granted") return;

  await plugin.addListener("registration", (t) => {
    storePushToken(t.value);
    // A logged-out launch just gets an error back, which is fine.
    void registerDeviceTokenAction(t.value);
  });
  await plugin.register();
}

/** Wires a tapped notification to navigation. `open` receives only a
 * path that passed isSafeAppPath. */
export async function listenForNotificationTaps(
  open: (path: string) => void,
  isSafePath: (value: unknown) => value is string,
): Promise<{ remove: () => void } | null> {
  const plugin = await loadPlugin();
  if (!plugin) return null;
  const handle = await plugin.addListener("pushNotificationActionPerformed", (action) => {
    const url = (action.notification.data as { url?: unknown } | undefined)?.url;
    if (isSafePath(url)) open(url);
  });
  return { remove: () => void handle.remove() };
}
