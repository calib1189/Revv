"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/site-url";

type ShareStatus = "idle" | "copied" | "failed";

/** Shares a build's public page. That page has real OG metadata
 * (generateMetadata + opengraph-image.tsx), so the link posts as a card
 * with the car's photo and score, not a bare URL. `text` goes out with
 * the link (see lib/rating/share-text.ts): a score and a dare get far
 * more taps than a URL on its own. */
function useShareBuild(vehicleId: string, text: string) {
  const [status, setStatus] = useState<ShareStatus>("idle");

  async function share() {
    const url = `${SITE_URL}/garage/${vehicleId}`;
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
      } catch {
        // User dismissed the native share sheet — not an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setStatus("copied");
    } catch {
      // Clipboard access can be denied (browser settings, an insecure
      // context) even when navigator.clipboard exists — silently doing
      // nothing here would leave someone tapping Share with zero
      // feedback and no way to know it didn't work.
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 1500);
  }

  return { status, share };
}

function statusLabel(status: ShareStatus): string {
  return status === "copied" ? "Link copied" : "Couldn't copy link";
}

/** The round Share button on the build page's photo. */
export function VehicleShareButton({ vehicleId, text }: { vehicleId: string; text: string }) {
  const { status, share } = useShareBuild(vehicleId, text);

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share this build"
      className="pressable relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-xl"
    >
      <ShareIcon className="h-4.5 w-4.5" />
      {status !== "idle" && (
        <span
          className={`absolute right-0 top-11 whitespace-nowrap rounded-lg bg-black/80 px-2.5 py-1 text-xs font-medium ${
            status === "failed" ? "text-danger" : "text-white"
          }`}
        >
          {statusLabel(status)}
        </span>
      )}
    </button>
  );
}

/** "Share my score", under the owner's own rating: the moment someone
 * has just seen their score is when they're most likely to post it. */
export function ShareScoreButton({ vehicleId, text }: { vehicleId: string; text: string }) {
  const { status, share } = useShareBuild(vehicleId, text);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button
        type="button"
        variant="secondary"
        onClick={share}
        className="h-11 w-full gap-2 text-[0.9375rem] font-semibold"
      >
        <ShareIcon className="h-4 w-4" />
        Share my score
      </Button>
      {status !== "idle" && (
        <p role="status" className={`text-xs ${status === "failed" ? "text-danger" : "text-muted"}`}>
          {statusLabel(status)}
        </p>
      )}
    </div>
  );
}
