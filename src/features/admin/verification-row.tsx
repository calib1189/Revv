"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { setOwnershipVerificationStatusAction } from "@/features/admin/actions";
import { formatDateTime } from "@/lib/format/date";

export interface VerificationRowData {
  vehicleId: string;
  vehicleTitle: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  drivetrain: string | null;
  color: string | null;
  mileage: number | null;
  description: string | null;
  submittedAt: string;
  ownerUsername: string;
  ownerMemberSince: string | null;
  /** Vehicles this owner has added before this one (not counting it). */
  priorVehicleCount: number;
  priorRejectedCount: number;
  photoUrl: string | null;
}

const SPEC_FIELDS: { label: string; get: (d: VerificationRowData) => string | number | null }[] = [
  { label: "Trim", get: (d) => d.trim },
  { label: "Engine", get: (d) => d.engine },
  { label: "Drivetrain", get: (d) => d.drivetrain },
  { label: "Color", get: (d) => d.color },
  { label: "Mileage", get: (d) => (d.mileage != null ? `${d.mileage.toLocaleString()} mi` : null) },
];

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

  const specs = SPEC_FIELDS.map((f) => ({ label: f.label, value: f.get(data) })).filter(
    (s): s is { label: string; value: string | number } => s.value != null && s.value !== "",
  );

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      {/* Full-size photo, not a small crop — the whole point of this
          review is confirming the car and the handwritten username are
          both clearly legible, which a thumbnail can't show. */}
      <div className="relative aspect-square w-full max-w-xs self-center overflow-hidden rounded-xl bg-surface-raised sm:self-start">
        {data.photoUrl && (
          <Image src={data.photoUrl} alt="" fill sizes="(min-width: 640px) 320px, 100vw" className="object-cover" />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
        <span>Submitted {formatDateTime(data.submittedAt)}</span>
        <span className="font-mono text-[0.65rem] text-muted/70">{data.vehicleId}</span>
      </div>

      <div>
        <p className="text-sm font-medium">{data.vehicleTitle || "Untitled vehicle"}</p>
        {specs.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {specs.map((s) => (
              <span key={s.label}>
                {s.label}: <span className="text-foreground">{s.value}</span>
              </span>
            ))}
          </div>
        )}
        {data.description && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{data.description}</p>
        )}
      </div>

      <Link href={`/garage/${data.vehicleId}`} target="_blank" className="text-xs text-accent hover:underline">
        View full vehicle page
      </Link>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <Link href={`/u/${data.ownerUsername}`} target="_blank" className="text-accent hover:underline">
          @{data.ownerUsername}
        </Link>
        <span>
          Member since {data.ownerMemberSince ? formatDateTime(data.ownerMemberSince) : "unknown"}
        </span>
        <span>
          {data.priorVehicleCount === 0
            ? "First vehicle"
            : `${data.priorVehicleCount} prior vehicle${data.priorVehicleCount === 1 ? "" : "s"}`}
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
