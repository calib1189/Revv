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

      // Scopes the scrollbar-hiding CSS below to the native app only — a
      // regular desktop browser should keep its normal scrollbar.
      document.documentElement.classList.add("native-app");

      const [{ StatusBar, Style }, { SplashScreen }, { App }, { Browser }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
        import("@capacitor/app"),
        import("@capacitor/browser"),
      ]);

      await StatusBar.setStyle({ style: Style.Dark });
      await SplashScreen.hide();

      // Anything that has to run in the system browser view rather than
      // this WebView (OAuth — Google outright refuses to show its login
      // page inside an embedded WebView — and Stripe Checkout, which a
      // WebView can't complete either) hands control back to the app via
      // a revv://<destination>?... custom-scheme URL. oauth-buttons.tsx,
      // ad-campaign-form.tsx, and create-meetup-form.tsx are the other
      // half of each: they open the provider's URL via Browser.open()
      // with one of these as the redirect target. Routed by host rather
      // than one hardcoded path, since there's more than one destination
      // now.
      const REVV_SCHEME_ROUTES: Record<string, string> = {
        auth: "/auth/callback",
        "ad-checkout": "/advertise",
        "meetup-checkout": "/discover",
      };

      const listener = await App.addListener("appUrlOpen", async ({ url }) => {
        if (!url.startsWith("revv://")) return;
        await Browser.close().catch(() => {});
        const parsed = new URL(url);
        const targetPath = REVV_SCHEME_ROUTES[parsed.hostname];
        if (!targetPath) return;
        // A real full-page navigation, not client routing — these are
        // real routes/Route Handlers that need a genuine request (e.g.
        // /auth/callback exchanges the code and sets session cookies
        // server-side); router.push() wouldn't hit them the same way.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `${window.location.origin}${targetPath}${parsed.search}`;
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
