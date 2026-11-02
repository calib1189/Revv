"use client";

import Link from "next/link";
import { useIsNative } from "@/lib/native/use-is-native";
import { HANDOFF_BUTTON_CLASS, WebHandoffButton } from "@/features/auth/web-handoff-button";
import { SITE_URL } from "@/lib/site-url";

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
const BUILDER_PATH = "/advertise/new";

/** The overview's call to action. On the web it simply opens the ad
 * builder. In the native app the builder (and its checkout) can't run —
 * see createWebHandoffAction — so the same button hands off to the
 * website, signed in, and lands directly on the builder: the person has
 * already read everything here, so they don't start over on the web. */
export function CreateAdButton({
  label = "Create your ad",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const isNative = useIsNative();

  if (!isNative) {
    // Also what renders before the platform check resolves — on native a
    // tap that early still lands on the builder, whose own gate hands off.
    return (
      <Link href={BUILDER_PATH} className={`${HANDOFF_BUTTON_CLASS} ${className}`}>
        {label}
      </Link>
    );
  }

  return (
    <WebHandoffButton
      nextPath={BUILDER_PATH}
      label={label}
      note={`Ads are set up on ${SITE_HOST}. You'll already be signed in.`}
      className={className}
    />
  );
}
