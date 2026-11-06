"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useIsNative } from "@/lib/native/use-is-native";
import { APP_STORE_URL } from "@/lib/app-store";

/**
 * The landing page's calls to action. On the website the App Store is
 * the main action, with web sign-up kept as the secondary one. Inside
 * the iPhone app (which loads this same site) nobody needs telling to
 * download it, so it falls back to plain sign-up and log-in.
 *
 * Until the platform is known the row is held invisible at full size,
 * so the app never shows a download button for a frame and the page
 * doesn't shift when the real buttons appear.
 */
export function GetAppActions({ showLogin = true }: { showLogin?: boolean }) {
  const isNative = useIsNative();

  if (isNative) {
    return (
      <div className="flex flex-wrap gap-3">
        <Link href="/signup">
          <Button className="px-7 py-3 text-base">Get started</Button>
        </Link>
        {showLogin && (
          <Link href="/login">
            <Button variant="secondary" className="px-7 py-3 text-base">
              Log in
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${isNative === null ? "invisible" : ""}`}>
      <div className="flex flex-wrap gap-3">
        <a
          href={APP_STORE_URL}
          className="inline-flex flex-col items-start justify-center rounded-full bg-accent px-7 py-2.5 text-accent-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.25),0_8px_24px_-10px_rgb(255_68_51_/_0.55)] transition-all duration-150 ease-[var(--ease-ios)] hover:bg-accent/90 active:scale-[0.97]"
        >
          <span className="text-[0.6875rem] font-medium uppercase leading-none tracking-[0.08em] opacity-80">
            Download on the
          </span>
          <span className="mt-1 text-lg font-semibold leading-none">App Store</span>
        </a>
        {showLogin && (
          <Link href="/login" className="self-center">
            <Button variant="secondary" className="px-7 py-3 text-base">
              Log in
            </Button>
          </Link>
        )}
      </div>
      <p className="text-sm text-muted">
        Not on iPhone?{" "}
        <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          Use SORZA on the web
        </Link>
      </p>
    </div>
  );
}
