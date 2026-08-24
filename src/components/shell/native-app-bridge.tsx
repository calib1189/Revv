"use client";

import { useEffect } from "react";

/** No-ops entirely on the regular web/PWA — only does anything when this
 * page is running inside the Capacitor-wrapped native shell. Dynamically
 * imported so the Capacitor JS bridge is never pulled into the ordinary
 * web bundle. */
export function NativeAppBridge() {
  useEffect(() => {
    let cancelled = false;
    let listenerHandle: { remove: () => void } | undefined;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const [{ StatusBar, Style }, { SplashScreen }, { App }, { Browser }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
        import("@capacitor/app"),
        import("@capacitor/browser"),
      ]);

      await StatusBar.setStyle({ style: Style.Dark });
      await SplashScreen.hide();

      // OAuth (Google/Apple) has to run in the system browser view, not
      // this WebView — Google outright refuses to show its login page
      // inside an embedded WebView. See oauth-buttons.tsx for the other
      // half: it opens the provider's login URL via Browser.open() with a
      // custom-scheme redirect ("revv://..."), which is what lands here
      // once the provider hands control back to the app.
      const listener = await App.addListener("appUrlOpen", async ({ url }) => {
        if (!url.startsWith("revv://")) return;
        await Browser.close().catch(() => {});
        const params = url.split("?")[1] ?? "";
        // A real full-page navigation, not client routing — /auth/callback
        // is a Route Handler that exchanges the code and sets session
        // cookies server-side; router.push() wouldn't hit it the same way.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `${window.location.origin}/auth/callback?${params}`;
      });

      if (cancelled) {
        listener.remove();
      } else {
        listenerHandle = listener;
      }
    })();

    return () => {
      cancelled = true;
      listenerHandle?.remove();
    };
  }, []);

  return null;
}
