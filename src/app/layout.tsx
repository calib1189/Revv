import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/shell/header";
import { LayoutFooter } from "@/components/shell/layout-footer";
import { NativeAppBridge } from "@/components/shell/native-app-bridge";
import { TabPagerProvider } from "@/components/shell/tab-pager-context";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getTutorialProgress } from "@/lib/db/tutorial-progress";
import { tutorialStartStep } from "@/lib/tutorial/steps";
import { TutorialHost } from "@/features/tutorial/tutorial-host";
import { SITE_URL } from "@/lib/site-url";
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

  // Where the first-time walkthrough should open for this person, if at
  // all. Only for confirmed accounts (their progress can actually be
  // saved), and never when it can't be read — e.g. before migration 0095
  // has been applied — so it can't end up showing on every launch.
  let tutorialStep: number | null = null;
  if (user?.email_confirmed_at) {
    try {
      tutorialStep = tutorialStartStep(await getTutorialProgress(await createClient(), user.id));
    } catch {
      tutorialStep = null;
    }
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
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
        <NativeAppBridge isSignedIn={Boolean(user)} />
        {user && <TutorialHost startStep={tutorialStep} />}
        <TabPagerProvider>
          <Header />
          <div
            className={`flex flex-1 flex-col ${user ? "pb-[calc(4rem_+_env(safe-area-inset-bottom))]" : ""}`}
          >
            <main className="flex flex-1 flex-col">{children}</main>
            <LayoutFooter />
          </div>
        </TabPagerProvider>
      </body>
    </html>
  );
}
