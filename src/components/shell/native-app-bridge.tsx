"use client";

import { useEffect } from "react";
import { isSafeAppPath } from "@/lib/push/validation";
import { listenForNotificationTaps, refreshNativePushRegistration } from "@/lib/native/push";

/** No-ops entirely on the regular web/PWA — only does anything when this
 * page is running inside the Capacitor-wrapped native shell. Dynamically
 * imported so the Capacitor JS bridge is never pulled into the ordinary
 * web bundle. */
export function NativeAppBridge() {
  useEffect(() => {
    let cancelled = false;
    let listenerHandle: { remove: () => void } | undefined;
    let tapHandle: { remove: () => void } | undefined;
    let resumeListenerHandle: { remove: () => void } | undefined;

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

      // OAuth has to run in the system browser view rather than this
      // WebView (Google outright refuses to show its login page inside
      // an embedded WebView) and hands control back to the app via a
      // sorza://auth?... custom-scheme URL — oauth-buttons.tsx is the
      // other half, opening Google/Apple's own URL via Browser.open()
      // with this as the redirect target. Checkout (ads, shop/meetup
      // promotion) used to have its own sorza:// routes here too, back
      // when it ran through this same in-app-browser-then-bounce-back
      // pattern — see createWebHandoffAction's doc comment for why that
      // no longer happens at all: those purchases now hand off to the
      // real external browser instead, which never comes back through
      // this app-open listener.
      const SORZA_SCHEME_ROUTES: Record<string, string> = {
        auth: "/auth/callback",
      };

      const listener = await App.addListener("appUrlOpen", async ({ url }) => {
        if (!url.startsWith("sorza://")) return;
        await Browser.close().catch(() => {});
        const parsed = new URL(url);
        const targetPath = SORZA_SCHEME_ROUTES[parsed.hostname];
        if (!targetPath) return;
        // A real full-page navigation, not client routing — these are
        // real routes/Route Handlers that need a genuine request (e.g.
        // /auth/callback exchanges the code and sets session cookies
        // server-side); router.push() wouldn't hit them the same way.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `${window.location.origin}${targetPath}${parsed.search}`;
      });

      // Tapping a push notification opens whatever it was about. The path
      // is validated on the device as well as built safely on the server:
      // a full-page navigation to an attacker-supplied URL from a
      // notification would be an open redirect with the app's name on it.
      const taps = await listenForNotificationTaps((path) => {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `${window.location.origin}${path}`;
      }, isSafeAppPath);

      // Keeps the server's copy of this device's push token current. Never
      // prompts for permission — see refreshNativePushRegistration.
      void refreshNativePushRegistration().catch(() => {});

      // WKWebView has a known, widely reported bug: a page with heavy
      // video/canvas content (the Feed's swipeable video list is exactly
      // this) can come back from the background with its GPU compositing
      // layers frozen — visually a black screen — until something forces
      // WebKit to recompute them. Scrolling is the most common thing
      // that does, which is exactly the manual "scroll down, then back
      // up" workaround. This listener does the same forcing automatically
      // on every resume, before anyone has to notice the black screen at
      // all: a one-frame, imperceptible opacity nudge on the whole
      // document forces WebKit to recomposite everything under it,
      // without depending on knowing which element is actually
      // scrollable on whatever page happens to be showing.
      const resumeHandle = await App.addListener("resume", () => {
        const root = document.documentElement;
        root.style.opacity = "0.999";
        // Cleared by whichever fires first, not requestAnimationFrame
        // alone — confirmed directly (not assumed) that rAF can go
        // unfired for a stretch in exactly the kind of just-foregrounded
        // moment this runs in, which would otherwise leave the opacity
        // stuck at 0.999 instead of invisible-and-reset. The 50ms
        // fallback is comfortably below anything a person would notice
        // as "the app looks slightly washed out," and the reset is
        // idempotent, so both paths firing is harmless.
        let done = false;
        const reset = () => {
          if (done) return;
          done = true;
          root.style.opacity = "";
        };
        requestAnimationFrame(reset);
        setTimeout(reset, 50);
      });

      if (cancelled) {
        listener.remove();
        taps?.remove();
        resumeHandle.remove();
      } else {
        listenerHandle = listener;
        tapHandle = taps ?? undefined;
        resumeListenerHandle = resumeHandle;
      }
    })();

    return () => {
      cancelled = true;
      listenerHandle?.remove();
      tapHandle?.remove();
      resumeListenerHandle?.remove();
    };
  }, []);

  return null;
}
