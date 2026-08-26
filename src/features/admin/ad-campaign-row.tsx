"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { approveAdCampaignAction, rejectAdCampaignAction } from "@/features/ads/actions";

export interface AdCampaignRowData {
  campaignId: string;
  headline: string;
  caption: string | null;
  destinationUrl: string;
  advertiserUsername: string;
  tierLabel: string;
  priceCents: number;
  photoUrl: string | null;
}

export function AdCampaignRow({ data }: { data: AdCampaignRowData }) {
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState(false);

  if (resolved) return null;

  function handle(action: "approve" | "reject") {
    startTransition(async () => {
      if (action === "approve") await approveAdCampaignAction(data.campaignId);
      else await rejectAdCampaignAction(data.campaignId);
      setResolved(true);
    });
  }

  return (
    <li className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-surface-raised">
          {data.photoUrl && (
            <Image src={data.photoUrl} alt="" fill sizes="96px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{data.headline}</p>
          {data.caption && <p className="truncate text-xs text-muted">{data.caption}</p>}
          <p className="truncate text-xs text-muted">
            @{data.advertiserUsername} · {data.tierLabel} · $
            {(data.priceCents / 100).toFixed(0)}
          </p>
          <a
            href={data.destinationUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs text-accent hover:underline"
          >
            {data.destinationUrl}
          </a>
        </div>
      </div>

      <div className="flex flex-shrink-0 gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handle("approve")}
          className="text-sm font-medium text-success hover:underline disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handle("reject")}
          className="text-sm text-danger hover:underline disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </li>
  );
}
