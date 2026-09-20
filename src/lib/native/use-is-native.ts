"use client";

import { useEffect, useState } from "react";

/** Whether this is running inside the Capacitor shell rather than a
 * browser. Null until the dynamic import resolves, so a caller can hold
 * off on rendering a platform-specific branch instead of flashing the
 * wrong one for a frame.
 *
 * Pulled out of NativeCheckoutGate because a screen can now be partly
 * native-capable: hosting a free meet works in the app, while paying to
 * promote one still has to hand off to the web, so the form needs the
 * answer without being wrapped in the gate wholesale. */
export function useIsNative(): boolean | null {
  const [isNative, setIsNative] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@capacitor/core").then(({ Capacitor }) => {
      if (!cancelled) setIsNative(Capacitor.isNativePlatform());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return isNative;
}
