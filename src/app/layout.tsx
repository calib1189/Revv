import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/shell/header";
import { LayoutFooter } from "@/components/shell/layout-footer";
import { NativeAppBridge } from "@/components/shell/native-app-bridge";
import { ScrollSmoothing } from "@/components/shell/scroll-smoothing";
import { InstantOpen } from "@/components/shell/instant-open";
import { TabPagerProvider } from "@/components/shell/tab-pager-context";
import { StoryViewerProvider } from "@/features/stories/story-viewer-provider";
import { getCurrentUser } from "@/lib/auth/get-user";
import { FirstRunGate } from "@/features/onboarding/first-run-gate";
import { CaptureInviteRef } from "@/features/invites/capture-invite-ref";
import { TimeZoneSync } from "@/features/push/time-zone-sync";
import { SITE_URL } from "@/lib/site-url";
import { APP_STORE_ID } from "@/lib/app-store";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "SORZA",
  description: "The social platform for your build.",
  // iOS only treats "Add to Home Screen" as a standalone app (full-screen,
  // no Safari chrome) with this set — and push notifications only work
  // from that standalone context on iOS, never in a plain Safari tab.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SORZA",
  },
  // Safari's own "SORZA — Get / Open" bar across the top of every page,
  // shared build links included. Only Safari draws it, never the app's
  // WebView, so people already in the app don't see it.
  itunes: { appId: APP_STORE_ID },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Read by the service worker (public/sw.js) to know whose page this
            is and which deploy made it, so a saved copy of the app is only
            ever shown to the same person on the same version. */}
        <meta name="sorza-user" content={user?.id ?? ""} />
        <meta
          name="sorza-build"
          content={process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "dev"}
        />
        {/* Feed videos, sounds and the browser's own data calls go straight
            to Supabase: open that connection while the page is still
            arriving, so the first video doesn't wait on a fresh handshake. */}
        {/* Two: <video>/<audio> requests and fetch() calls use separate
            connection pools, so each gets its own warm connection. */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link rel="preconnect" href={new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin} />
            <link rel="preconnect" href={new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin} crossOrigin="anonymous" />
          </>
        )}
        {/* Applies the saved theme before first paint, so there's no
            flash of the default (dark) theme for someone who picked
            light. Runs before hydration, hence suppressHydrationWarning
            above — the attribute it sets is expected to differ from the
            server-rendered markup. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("sorza-theme");if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <NativeAppBridge />
        <ScrollSmoothing />
        <InstantOpen signedIn={Boolean(user)} />
        {!user && <CaptureInviteRef />}
        {user && <TimeZoneSync />}
        {user && (
          <Suspense fallback={null}>
            <FirstRunGate user={user} />
          </Suspense>
        )}
        <TabPagerProvider>
          <StoryViewerProvider>
            <Header />
            <div
              className={`flex flex-1 flex-col ${user ? "pb-[var(--bottom-nav-h)]" : ""}`}
            >
              <main className="flex flex-1 flex-col">{children}</main>
              <LayoutFooter />
            </div>
          </StoryViewerProvider>
        </TabPagerProvider>
      </body>
    </html>
  );
}
