"use client";

import { useEffect, useState } from "react";
import { isAndroidApp } from "@/lib/native/android-app";

export type AppShell = "ios" | "android" | "web";

/** Which shell this page is running in: the iPhone app (Capacitor), the
 * Android app (a Trusted Web Activity, see lib/native/android-app), or a
 * browser. Null until known, so a caller can hold off on a
 * platform-specific branch instead of flashing the wrong one. */
export function useAppShell(): AppShell | null {
  const [shell, setShell] = useState<AppShell | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@capacitor/core").then(({ Capacitor }) => {
      if (cancelled) return;
      setShell(isAndroidApp() ? "android" : Capacitor.isNativePlatform() ? "ios" : "web");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return shell;
}

/** Whether this is running inside one of the store apps rather than a
 * browser. Purchases follow the store's rules there: the iPhone app hands
 * off to the web, the Android app doesn't offer them (see
 * WebHandoffButton). Null until known.
 *
 * Pulled out of NativeCheckoutGate because a screen can now be partly
 * native-capable: hosting a free meet works in the app, while paying to
 * promote one still has to hand off to the web, so the form needs the
 * answer without being wrapped in the gate wholesale. */
export function useIsNative(): boolean | null {
  const shell = useAppShell();
  return shell === null ? null : shell !== "web";
}
