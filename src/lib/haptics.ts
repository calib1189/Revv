"use client";

import { getDevicePreferences } from "@/lib/device-preferences";
import { isAndroidApp } from "@/lib/native/android-app";

/** No-ops entirely outside the native app shell — same
 * dynamic-import-behind-a-platform-check pattern as
 * native-app-bridge.tsx, so the Capacitor bridge never reaches the
 * ordinary web/PWA bundle. A haptic is a bonus on top of the reveal's
 * sound/visual cues, never something its absence (a failed import, an
 * unsupported platform) should break. */
async function fireHaptic(
  run: (haptics: typeof import("@capacitor/haptics")) => Promise<void>,
  /** The same moment as a vibration pattern, for the Android app. */
  vibration: number | number[],
) {
  // Settings → Playback → Haptics.
  if (!getDevicePreferences().haptics) return;
  // The Android app is the site in Chrome, with no Capacitor bridge: it
  // gets the browser's own vibration instead.
  if (isAndroidApp()) {
    try {
      navigator.vibrate?.(vibration);
    } catch {
      // Best-effort only.
    }
    return;
  }
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const haptics = await import("@capacitor/haptics");
    await run(haptics);
  } catch {
    // Best-effort only.
  }
}

/** A light tap on every tier crossing during the build-rating reveal's
 * climb. */
export function hapticTierUp() {
  void fireHaptic(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }), 12);
}

/** A stronger success pulse the moment the build's final rating lands. */
export function hapticLanding() {
  void fireHaptic(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Success }), [18, 60, 28]);
}

/** The faintest tick: something snapped into place (a story sticker
 * lining up with the center, or reaching the bin). */
export function hapticSnap() {
  void fireHaptic(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }), 8);
}
