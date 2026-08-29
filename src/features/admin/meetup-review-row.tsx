"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { approveMeetupAction, rejectMeetupAction } from "@/features/meetups/actions";
import { formatDateTime } from "@/lib/format/date";

export interface MeetupReviewRowData {
  meetupId: string;
  title: string;
  description: string | null;
  locationName: string;
  startsAt: string;
  hostUsername: string;
  hostMemberSince: string | null;
  priorMeetupCount: number;
  priorRejectedCount: number;
  tierLabel: string;
  priceCents: number;
  submittedAt: string;
  photoUrls: string[];
}

export function MeetupReviewRow({ data }: { data: MeetupReviewRowData }) {
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState(false);

  if (resolved) return null;

  function handle(action: "approve" | "reject") {
    startTransition(async () => {
      if (action === "approve") await approveMeetupAction(data.meetupId);
      else await rejectMeetupAction(data.meetupId);
      setResolved(true);
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      {data.photoUrls.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {data.photoUrls.map((url) => (
            <div
              key={url}
              className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-surface-raised"
            >
              <Image src={url} alt="" fill sizes="112px" className="object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
        <span>Submitted {formatDateTime(data.submittedAt)}</span>
        <span className="font-mono text-[0.65rem] text-muted/70">{data.meetupId}</span>
      </div>

      <div>
        <p className="text-sm font-medium">{data.title}</p>
        {data.description && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{data.description}</p>
        )}
      </div>

      <div className="rounded-xl bg-surface-raised px-3 py-2.5 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">When &amp; where</p>
        <p className="mt-0.5 font-medium">{formatDateTime(data.startsAt)}</p>
        <p className="mt-0.5 truncate text-muted">{data.locationName}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <Link href={`/u/${data.hostUsername}`} target="_blank" className="text-accent hover:underline">
          @{data.hostUsername}
        </Link>
        <span>
          Member since{" "}
          {data.hostMemberSince ? formatDateTime(data.hostMemberSince) : "unknown"}
        </span>
        <span>
          {data.priorMeetupCount === 0
            ? "First meetup"
            : `${data.priorMeetupCount} prior meetup${data.priorMeetupCount === 1 ? "" : "s"}`}
          {data.priorRejectedCount > 0 && (
            <span className="text-danger"> · {data.priorRejectedCount} rejected before</span>
          )}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-xs text-muted">
          {data.tierLabel} · ${(data.priceCents / 100).toFixed(0)}
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
