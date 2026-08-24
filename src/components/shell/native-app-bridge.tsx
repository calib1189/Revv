"use client";

import { useEffect } from "react";

/** No-ops entirely on the regular web/PWA — only does anything when this
 * page is running inside the Capacitor-wrapped native shell. Dynamically
 * imported so the Capacitor JS bridge is never pulled into the ordinary
 * web bundle. */
export function NativeAppBridge() {
  useEffect(() => {
    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ]);

      await StatusBar.setStyle({ style: Style.Dark });
      await SplashScreen.hide();
    })();
  }, []);

  return null;
}
