import type { CapacitorConfig } from "@capacitor/cli";

// SORZA is a server-rendered Next.js app (Server Components, Server
// Actions, middleware-based auth) — none of that survives a static
// export, so this isn't a bundled-webDir Capacitor app. Instead the
// native shell just points its WebView at the real deployed site. webDir
// still has to point at *something* on disk (Capacitor's CLI requires
// it to exist), so it's a placeholder that's never actually served.
const config: CapacitorConfig = {
  // "com.revv.app" was already taken — bundle IDs are globally unique
  // across every Apple developer account, not just this one.
  appId: "com.calib1189.revv",
  appName: "SORZA",
  webDir: "public",
  // Without this, the WKWebView's own background defaults to white — every
  // overscroll/rubber-band bounce flashes white underneath the dark UI,
  // which is exactly what makes a native app feel like a browser instead.
  backgroundColor: "#0a0a0b",
  server: {
    url: "https://revv-eta.vercel.app",
    // Lets links that leave the app domain (e.g. an OAuth provider's own
    // login page) still open inside the app instead of erroring — the
    // WebView otherwise refuses to navigate off the configured origin.
    allowNavigation: ["*.supabase.co", "accounts.google.com", "appleid.apple.com"],
  },
  ios: {
    // The web app already insets itself around the notch/home-indicator
    // via env(safe-area-inset-*) in its own CSS (added earlier for the
    // PWA). "always" makes the native layer *also* push content down for
    // the safe area on top of that — same gap applied twice, which is
    // exactly the oversized empty strip under the status bar this fixes.
    contentInset: "never",
  },
};

export default config;
