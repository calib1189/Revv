"use client";

import { useEffect, useState } from "react";
import { ShareIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/site-url";

type ShareStatus = "idle" | "copied" | "failed";

/** Shares a build's public page. That page has real OG metadata
 * (generateMetadata + opengraph-image.tsx), so the link posts as a card
 * with the car's photo and score, not a bare URL. `text` goes out with
 * the link (see lib/rating/share-text.ts): a score and a dare get far
 * more taps than a URL on its own. */
function useShareBuild(vehicleId: string, text: string, cardUrl?: string) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const card = useCardFile(cardUrl);

  async function share() {
    const url = `${SITE_URL}/garage/${vehicleId}`;
    // The build's trading card (garage/[vehicleId]/card) goes with the
    // link when this device can share images. Loaded ahead of time: iOS
    // only opens the share sheet right after the tap, and drawing the card
    // can take a few seconds. Not ready, or no image sharing: the link.
    if (card && navigator.canShare?.({ files: [card] })) {
      try {
        // Some apps drop `url` when a file is attached, so it rides in the text.
        await navigator.share({ files: [card], text: `${text} ${url}` });
      } catch {
        // User dismissed the native share sheet — not an error.
      }
      return;
    }
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

/** The card image as a File, fetched once in the background. Null until
 * it's ready, or if it can't be drawn (the share falls back to the link). */
function useCardFile(cardUrl: string | undefined): File | null {
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    if (!cardUrl) return;
    let cancelled = false;
    fetch(cardUrl)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => {
        if (!cancelled) setFile(new File([blob], "sorza-card.png", { type: "image/png" }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cardUrl]);
  return file;
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
export function ShareScoreButton({ vehicleId, text, cardUrl }: { vehicleId: string; text: string; cardUrl?: string }) {
  const { status, share } = useShareBuild(vehicleId, text, cardUrl);

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
