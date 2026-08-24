import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/shell/header";
import { Footer } from "@/components/shell/footer";
import { getCurrentUser } from "@/lib/auth/get-user";
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
  title: "REVV",
  description: "The social platform for your build.",
};

export const viewport: Viewport = {
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
        {/* Applies the saved theme before first paint, so there's no
            flash of the default (dark) theme for someone who picked
            light. Runs before hydration, hence suppressHydrationWarning
            above — the attribute it sets is expected to differ from the
            server-rendered markup. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("revv-theme");if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <Header />
        <div
          className={`flex flex-1 flex-col ${user ? "pb-[calc(4rem_+_env(safe-area-inset-bottom))]" : ""}`}
        >
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
