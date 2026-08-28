"use client";

import { useState, useTransition } from "react";
import { endAdCampaignAction } from "@/features/ads/actions";

export function EndAdCampaignButton({ campaignId }: { campaignId: string }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [ended, setEnded] = useState(false);

  if (ended) {
    return <span className="text-xs text-muted">Ended</span>;
  }

  if (isConfirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="text-danger">End this now?</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await endAdCampaignAction(campaignId);
              setEnded(true);
            })
          }
          className="font-medium text-danger underline underline-offset-2 disabled:opacity-60"
        >
          {isPending ? "Ending…" : "Confirm"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setIsConfirming(false)}
          className="text-muted underline underline-offset-2"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsConfirming(true)}
      className="text-xs font-medium text-danger hover:underline"
    >
      End now
    </button>
  );
}
