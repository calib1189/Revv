"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/ui/icons";
import { SITE_URL } from "@/lib/site-url";

/** Shares the crew's link. It carries the sharer's ?ref= (features/invites),
 * so inviting someone to the crew also counts as inviting them to SORZA. */
export function CrewInviteButton({
  crewId,
  crewName,
  refUsername,
  className = "",
  label = "Invite",
}: {
  crewId: string;
  crewName: string;
  refUsername: string | null;
  className?: string;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function share() {
    const url = `${SITE_URL}/crews/${crewId}${refUsername ? `?ref=${encodeURIComponent(refUsername)}` : ""}`;
    const text = `Join ${crewName} on SORZA. Bring your build.`;
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
      } catch {
        // Dismissed the share sheet: nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 1600);
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`pressable inline-flex items-center justify-center gap-2 font-semibold ${className}`}
    >
      <ShareIcon className="h-4 w-4" />
      {status === "copied" ? "Link copied" : status === "failed" ? "Couldn't copy" : label}
    </button>
  );
}
