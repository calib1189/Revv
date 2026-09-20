"use client";

import { useState } from "react";
import { createWebHandoffAction } from "@/features/auth/actions";
import { useIsNative } from "@/lib/native/use-is-native";
import { openExternalBrowser } from "@/lib/native/open-external";
import { SITE_URL } from "@/lib/site-url";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

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
  /** e.g. "Creating an ad" — used in "X happens on the web." */
  what: string;
  /** What to render off-native. Omit when the caller has already decided
   * this is the native-only branch and wants just the handoff card — the
   * meetup form does exactly that, since only its paid tiers hand off
   * while the free one posts in-app. */
  children?: React.ReactNode;
}) {
  const isNative = useIsNative();
  const [error, setError] = useState<string | null>(null);
  const [sentToWeb, setSentToWeb] = useState(false);

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
  if (!isNative) return <>{children ?? null}</>;

  return (
    <div className="glass-raised elev-1 flex flex-col items-center gap-3 rounded-[22px] p-6 text-center">
      {error && <Callout tone="danger">{error}</Callout>}
      {sentToWeb ? (
        <p className="text-sm text-muted">
          Opened in your browser, already signed in — finish there.
        </p>
      ) : (
        <>
          <p className="text-sm font-medium">{what} happens on the web</p>
          <p className="max-w-xs text-xs text-muted">
            Tap below to continue on {SITE_HOST} — you&apos;ll already be signed in.
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
