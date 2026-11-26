"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useIsNative } from "@/lib/native/use-is-native";
import { StoreBadges } from "@/features/landing/store-badges";

/**
 * The landing page's calls to action. On the website the App Store and
 * Google Play badges are the main action, with web sign-up kept as the
 * secondary one. Inside
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

  // Read only once the shell is known (after mount), so the server and
  // the first client render agree on the order.
  const platform =
    isNative === null ? "other" : /iPhone|iPad|iPod/.test(navigator.userAgent) ? "ios" : /Android/i.test(navigator.userAgent) ? "android" : "other";

  return (
    <div className={`flex flex-col gap-4 ${isNative === null ? "invisible" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <StoreBadges platform={platform} height={46} />
        {showLogin && (
          <Link href="/login" className="self-center">
            <Button variant="secondary" className="px-7 py-3 text-base">
              Log in
            </Button>
          </Link>
        )}
      </div>
      <p className="text-sm text-muted">
        On a computer?{" "}
        <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          Use SORZA on the web
        </Link>
      </p>
    </div>
  );
}
