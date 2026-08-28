"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { approveAdCampaignAction, rejectAdCampaignAction } from "@/features/ads/actions";
import { formatDateTime } from "@/lib/format/date";

export interface AdCampaignRowData {
  campaignId: string;
  headline: string;
  caption: string | null;
  destinationUrl: string;
  advertiserUsername: string;
  /** Null if the advertiser's profile somehow can't be found — shows a
   * "not found" flag rather than hiding the field, since a missing
   * advertiser record on a paid submission is itself worth a reviewer's
   * attention. */
  advertiserMemberSince: string | null;
  /** Campaigns this advertiser has submitted before this one (not
   * counting it) — a first submission vs. a long history changes how
   * much to trust it at a glance. */
  priorCampaignCount: number;
  priorRejectedCount: number;
  tierLabel: string;
  durationDays: number;
  priceCents: number;
  submittedAt: string;
  photoUrl: string | null;
}

function destinationHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
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

  const hostname = destinationHostname(data.destinationUrl);

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      {/* Full-bleed, uncropped-feeling preview — the size an ad actually
          renders in the feed (sponsored-slide.tsx is full-width too) —
          rather than a small cropped thumbnail a reviewer can't really
          judge content from. */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-surface-raised">
        {data.photoUrl && (
          <Image src={data.photoUrl} alt="" fill sizes="(min-width: 640px) 600px, 100vw" className="object-cover" />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
        <span>Submitted {formatDateTime(data.submittedAt)}</span>
        <span className="font-mono text-[0.65rem] text-muted/70">{data.campaignId}</span>
      </div>

      <div>
        <p className="text-sm font-medium">{data.headline}</p>
        {data.caption && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{data.caption}</p>}
      </div>

      <div className="rounded-xl bg-surface-raised px-3 py-2.5 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Links to</p>
        <p className="mt-0.5 truncate font-medium">{hostname ?? "Invalid URL"}</p>
        <a
          href={data.destinationUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-0.5 block truncate text-xs text-accent hover:underline"
        >
          {data.destinationUrl}
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <Link href={`/u/${data.advertiserUsername}`} target="_blank" className="text-accent hover:underline">
          @{data.advertiserUsername}
        </Link>
        <span>
          Member since{" "}
          {data.advertiserMemberSince ? formatDateTime(data.advertiserMemberSince) : "unknown"}
        </span>
        <span>
          {data.priorCampaignCount === 0
            ? "First campaign"
            : `${data.priorCampaignCount} prior campaign${data.priorCampaignCount === 1 ? "" : "s"}`}
          {data.priorRejectedCount > 0 && (
            <span className="text-danger"> · {data.priorRejectedCount} rejected before</span>
          )}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-xs text-muted">
          {data.tierLabel} · {data.durationDays} days · ${(data.priceCents / 100).toFixed(0)}
        </p>
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
      </div>
    </li>
  );
}
