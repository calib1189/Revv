"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/ui/icons";
import { SITE_URL } from "@/lib/site-url";

/** The public build page (this route) already has real OG metadata
 * (generateMetadata + opengraph-image.tsx) — a link posted anywhere
 * shows up as a real card with the car's photo, not a bare URL. This
 * button is just what was missing: an easy way to actually get that
 * link, instead of copying it out of the address bar. */
export function VehicleShareButton({ vehicleId }: { vehicleId: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleShare() {
    const url = `${SITE_URL}/garage/${vehicleId}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // User dismissed the native share sheet — not an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
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

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share this build"
      className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-black/50 text-white"
    >
      <ShareIcon className="h-4.5 w-4.5" />
      {status !== "idle" && (
        <span
          className={`absolute right-0 top-11 whitespace-nowrap rounded-lg bg-black/80 px-2.5 py-1 text-xs font-medium ${
            status === "failed" ? "text-danger" : "text-white"
          }`}
        >
          {status === "copied" ? "Link copied" : "Couldn't copy link"}
        </span>
      )}
    </button>
  );
}
