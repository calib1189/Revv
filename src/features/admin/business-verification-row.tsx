"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { setBusinessVerificationStatusAction } from "@/features/admin/actions";
import { formatDateTime } from "@/lib/format/date";

export interface BusinessVerificationRowData {
  businessProfileId: string;
  placeName: string;
  placeAddress: string | null;
  submittedAt: string;
  ownerUsername: string;
  ownerMemberSince: string | null;
  priorClaimCount: number;
  priorRejectedCount: number;
  proofPhotoUrl: string | null;
}

export function BusinessVerificationRow({ data }: { data: BusinessVerificationRowData }) {
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState(false);

  if (resolved) return null;

  function handle(status: "approved" | "rejected") {
    startTransition(async () => {
      await setBusinessVerificationStatusAction(data.businessProfileId, status);
      setResolved(true);
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <div className="relative aspect-square w-full max-w-xs self-center overflow-hidden rounded-xl bg-surface-raised sm:self-start">
        {data.proofPhotoUrl && (
          <Image src={data.proofPhotoUrl} alt="" fill sizes="(min-width: 640px) 320px, 100vw" className="object-cover" />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
        <span>Submitted {formatDateTime(data.submittedAt)}</span>
        <span className="font-mono text-[0.65rem] text-muted/70">{data.businessProfileId}</span>
      </div>

      <div>
        <p className="text-sm font-medium">{data.placeName}</p>
        {data.placeAddress && <p className="mt-1 text-xs text-muted">{data.placeAddress}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <Link href={`/u/${data.ownerUsername}`} target="_blank" className="text-accent hover:underline">
          @{data.ownerUsername}
        </Link>
        <span>
          Member since {data.ownerMemberSince ? formatDateTime(data.ownerMemberSince) : "unknown"}
        </span>
        <span>
          {data.priorClaimCount === 0
            ? "First claim"
            : `${data.priorClaimCount} prior claim${data.priorClaimCount === 1 ? "" : "s"}`}
          {data.priorRejectedCount > 0 && (
            <span className="text-danger"> · {data.priorRejectedCount} rejected before</span>
          )}
        </span>
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handle("approved")}
          className="text-sm font-medium text-success hover:underline disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handle("rejected")}
          className="text-sm text-danger hover:underline disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </li>
  );
}
