import type { CapacitorConfig } from "@capacitor/cli";

// REVV is a server-rendered Next.js app (Server Components, Server
// Actions, middleware-based auth) — none of that survives a static
// export, so this isn't a bundled-webDir Capacitor app. Instead the
// native shell just points its WebView at the real deployed site. webDir
// still has to point at *something* on disk (Capacitor's CLI requires
// it to exist), so it's a placeholder that's never actually served.
const config: CapacitorConfig = {
  // "com.revv.app" was already taken — bundle IDs are globally unique
  // across every Apple developer account, not just this one.
  appId: "com.calib1189.revv",
  appName: "REVV",
  webDir: "public",
  server: {
    url: "https://revv-eta.vercel.app",
    // Lets links that leave the app domain (e.g. an OAuth provider's own
    // login page) still open inside the app instead of erroring — the
    // WebView otherwise refuses to navigate off the configured origin.
    allowNavigation: ["*.supabase.co", "accounts.google.com", "appleid.apple.com"],
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
