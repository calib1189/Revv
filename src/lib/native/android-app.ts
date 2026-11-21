/** The Play Store app is a Trusted Web Activity: this same site, opened
 * full screen in Chrome by a small Android package. There's no
 * Capacitor bridge in it, so Capacitor.isNativePlatform() is false and
 * the page has to tell for itself. Chrome gives two signals on launch:
 * the app's launch URL carries ?app=android, and the first page's
 * referrer is android-app://<package>. Neither survives a later full
 * reload, so the answer is kept in sessionStorage, which belongs to the
 * app's own tab and isn't shared with the person's Chrome tabs. */

export const ANDROID_PACKAGE = "com.sorza.app";
const KEY = "sorza:android-app";

let known: boolean | null = null;

export function isAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  if (known !== null) return known;
  let stored = false;
  try {
    stored = window.sessionStorage.getItem(KEY) === "1";
  } catch {
    // Storage blocked: fall back to this load's own signals.
  }
  const launched =
    document.referrer.startsWith(`android-app://${ANDROID_PACKAGE}`) ||
    new URLSearchParams(window.location.search).get("app") === "android";
  if (launched && !stored) {
    try {
      window.sessionStorage.setItem(KEY, "1");
    } catch {
      // Still right for this load.
    }
  }
  known = stored || launched;
  return known;
}
