"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/ui/icons";
import { SITE_URL } from "@/lib/site-url";

/** Shares a battle's page, which posts as a card with both cars
 * (battle/[battleId]/opengraph-image). A signed-in sharer's link carries
 * ?ref= so it counts as their invite, like sharing a build. */
export function ShareBattleButton({
  battleId,
  text,
  refUsername = null,
  onMedia = false,
}: {
  battleId: string;
  text: string;
  refUsername?: string | null;
  onMedia?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function share() {
    const url = `${SITE_URL}/battle/${battleId}${refUsername ? `?ref=${encodeURIComponent(refUsername)}` : ""}`;
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
      } catch {
        // Dismissed the share sheet; not an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`pressable flex h-10 flex-shrink-0 items-center gap-1.5 rounded-full px-4 text-[0.875rem] font-semibold ${
        onMedia ? "bg-white/15 text-white backdrop-blur-md" : "bg-foreground/[0.1] text-foreground"
      }`}
    >
      <ShareIcon className="h-4 w-4" />
      {status === "copied" ? "Link copied" : status === "failed" ? "Couldn't copy" : "Share"}
    </button>
  );
}
