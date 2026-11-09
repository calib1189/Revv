"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { setOwnershipVerificationStatusAction } from "@/features/admin/actions";
import { formatDateTime } from "@/lib/format/date";
import { REJECTION_REASON_MAX } from "@/lib/validation/rejection-reason";

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
  /** Its saved SORZA score, or null if it hasn't been rated yet. */
  score: number | null;
  /** Set when this car was rejected before and came back with a new
   * photo: what the owner was told last time. */
  previousRejectionReason: string | null;
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
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (resolved) return null;

  function handle(status: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      try {
        const result = await setOwnershipVerificationStatusAction(
          data.vehicleId,
          status,
          status === "rejected" ? reason : null,
        );
        if (result.error) setError(result.error);
        else setResolved(true);
      } catch {
        setError("Couldn't save that. Try again.");
      }
    });
  }

  const specs = SPEC_FIELDS.map((f) => ({ label: f.label, value: f.get(data) })).filter(
    (s): s is { label: string; value: string | number } => s.value != null && s.value !== "",
  );

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      {/* Full-size photo, not a small crop: the review is judging
          whether this is a real car the person owns, which a thumbnail
          can't show. */}
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
        <p className="text-sm font-medium">
          {data.vehicleTitle || "Untitled vehicle"}
          <span className="ml-2 text-xs font-normal text-muted">
            {data.score != null ? `Score ${data.score.toFixed(2)}` : "Not rated yet"}
          </span>
        </p>
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

      {data.previousRejectionReason && (
        <p className="rounded-xl bg-foreground/[0.05] px-3 py-2 text-xs text-muted">
          Rejected before, now has a new photo. You told them: &ldquo;{data.previousRejectionReason}&rdquo;
        </p>
      )}

      {rejecting ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <label htmlFor={`reject-${data.vehicleId}`} className="text-sm font-medium">
            Why isn&apos;t it approved?
          </label>
          <textarea
            id={`reject-${data.vehicleId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={REJECTION_REASON_MAX}
            rows={3}
            autoFocus
            placeholder="e.g. This photo looks like it's from Google. Upload a photo you took of your car."
            className="glass-inset w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
          />
          <p className="text-xs text-muted">
            @{data.ownerUsername} gets this as a notification and sees it on their car page. A new cover photo sends
            the car back here.
          </p>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setRejecting(false);
                setError(null);
              }}
              className="text-sm text-muted hover:underline disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handle("rejected")}
              className="text-sm font-medium text-danger hover:underline disabled:opacity-60"
            >
              {isPending ? "Sending…" : reason.trim() ? "Reject and send" : "Reject without a message"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handle("approved")}
              className="text-sm font-medium text-success hover:underline disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Approve"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setRejecting(true)}
              className="text-sm text-danger hover:underline disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
