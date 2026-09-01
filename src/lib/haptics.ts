"use client";

/** No-ops entirely outside the native app shell — same
 * dynamic-import-behind-a-platform-check pattern as
 * native-app-bridge.tsx, so the Capacitor bridge never reaches the
 * ordinary web/PWA bundle. A haptic is a bonus on top of the reveal's
 * sound/visual cues, never something its absence (a failed import, an
 * unsupported platform) should break. */
async function fireHaptic(run: (haptics: typeof import("@capacitor/haptics")) => Promise<void>) {
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
  void fireHaptic(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }));
}

/** A stronger success pulse the moment the build's final rating lands. */
export function hapticLanding() {
  void fireHaptic(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Success }));
}
