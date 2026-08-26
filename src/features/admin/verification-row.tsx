"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { setOwnershipVerificationStatusAction } from "@/features/admin/actions";

export interface VerificationRowData {
  vehicleId: string;
  vehicleTitle: string;
  ownerUsername: string;
  photoUrl: string | null;
}

export function VerificationRow({ data }: { data: VerificationRowData }) {
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState(false);

  if (resolved) return null;

  function handle(status: "approved" | "rejected") {
    startTransition(async () => {
      await setOwnershipVerificationStatusAction(data.vehicleId, status);
      setResolved(true);
    });
  }

  return (
    <li className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-surface-raised">
          {data.photoUrl && (
            <Image src={data.photoUrl} alt="" fill sizes="80px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{data.vehicleTitle}</p>
          <p className="text-xs text-muted">@{data.ownerUsername}</p>
          <Link
            href={`/garage/${data.vehicleId}`}
            className="text-xs text-accent hover:underline"
          >
            View vehicle
          </Link>
        </div>
      </div>

      <div className="flex flex-shrink-0 gap-3">
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
