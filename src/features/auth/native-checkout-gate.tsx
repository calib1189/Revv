"use client";

import { useEffect, useState } from "react";
import { createWebHandoffAction } from "@/features/auth/actions";
import { openExternalBrowser } from "@/lib/native/open-external";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";

/**
 * Wraps a purchase-initiating form (ad campaigns, meetup creation) so a
 * native user never fills it out at all before finding out it's about
 * to hand off to the web anyway — see createWebHandoffAction's doc
 * comment for why that handoff exists. Detected once on mount rather
 * than inline in a submit handler, specifically so the "this happens on
 * the web" message is the first thing a native user sees, not something
 * they discover after typing a headline and picking a photo.
 */
export function NativeCheckoutGate({
  nextPath,
  what,
  children,
}: {
  nextPath: string;
  /** e.g. "Creating an ad" — used in "X happens on revv.app, not in the app." */
  what: string;
  children: React.ReactNode;
}) {
  const [isNative, setIsNative] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentToWeb, setSentToWeb] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("@capacitor/core").then(({ Capacitor }) => {
      if (!cancelled) setIsNative(Capacitor.isNativePlatform());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleContinue() {
    setError(null);
    const handoff = await createWebHandoffAction(nextPath);
    if (handoff.error || !handoff.url) {
      setError(handoff.error ?? "Couldn't open that on the web. Try again.");
      return;
    }
    openExternalBrowser(handoff.url);
    setSentToWeb(true);
  }

  if (isNative === null) return null;
  if (!isNative) return <>{children}</>;

  return (
    <div className="glass flex flex-col items-center gap-3 rounded-2xl p-6 text-center">
      {error && <Callout tone="danger">{error}</Callout>}
      {sentToWeb ? (
        <p className="text-sm text-muted">
          Opened in your browser, already signed in — finish there.
        </p>
      ) : (
        <>
          <p className="text-sm font-medium">{what} happens on the web</p>
          <p className="max-w-xs text-xs text-muted">
            Tap below to continue on revv-eta.vercel.app — you&apos;ll already
            be signed in.
          </p>
          <Button
            type="button"
            onClick={handleContinue}
            className="px-5 py-2.5 text-sm"
          >
            Continue on the web
          </Button>
        </>
      )}
    </div>
  );
}
