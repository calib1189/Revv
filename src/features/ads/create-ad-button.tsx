"use client";

import { useState } from "react";
import Link from "next/link";
import { createWebHandoffAction } from "@/features/auth/actions";
import { useIsNative } from "@/lib/native/use-is-native";
import { openExternalBrowser } from "@/lib/native/open-external";
import { SITE_URL } from "@/lib/site-url";
import { Spinner } from "@/components/ui/spinner";

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
const BUILDER_PATH = "/advertise/new";

const BUTTON_CLASS =
  "pressable inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-[0.9375rem] font-semibold text-accent-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),0_8px_24px_-10px_rgb(255_68_51/0.55)]";

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
  const [state, setState] = useState<"idle" | "opening" | "sent" | "error">("idle");

  async function handleHandoff() {
    setState("opening");
    const handoff = await createWebHandoffAction(BUILDER_PATH);
    if (handoff.error || !handoff.url) {
      setState("error");
      return;
    }
    openExternalBrowser(handoff.url);
    setState("sent");
  }

  if (!isNative) {
    // Also what renders before the platform check resolves — on native a
    // tap that early still lands on the builder, whose own gate hands off.
    return (
      <Link href={BUILDER_PATH} className={`${BUTTON_CLASS} ${className}`}>
        {label}
      </Link>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => void handleHandoff()}
        disabled={state === "opening"}
        className={`${BUTTON_CLASS} w-full disabled:opacity-70`}
      >
        {state === "opening" && <Spinner className="h-4 w-4" />}
        {state === "sent" ? "Opened in your browser" : label}
      </button>
      <p className={`text-center text-[0.8125rem] ${state === "error" ? "text-danger" : "text-muted"}`}>
        {state === "error"
          ? "Couldn't open the website. Try again."
          : state === "sent"
            ? "Finish setting up your ad there."
            : `Ads are set up on ${SITE_HOST}. You'll already be signed in.`}
      </p>
    </div>
  );
}
