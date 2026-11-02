"use client";

import { useIsNative } from "@/lib/native/use-is-native";
import { WebHandoffButton } from "@/features/auth/web-handoff-button";
import { SITE_URL } from "@/lib/site-url";

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

  if (isNative === null) return null;
  if (!isNative) return <>{children ?? null}</>;

  return (
    <div className="glass-raised elev-1 flex flex-col items-center gap-4 rounded-[22px] p-6 text-center">
      <p className="text-sm font-medium">{what} happens on the web</p>
      <WebHandoffButton
        nextPath={nextPath}
        label={`Continue on ${SITE_HOST}`}
        className="w-full max-w-xs"
      />
    </div>
  );
}
