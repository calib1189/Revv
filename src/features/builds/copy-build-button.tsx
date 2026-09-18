"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { copyBuildAction } from "@/features/builds/copy-build-actions";
import { Button } from "@/components/ui/button";
import type { Vehicle } from "@/lib/db/vehicles";

/** "Copy this build" — a card inviting a visitor to start a draft build
 * on one of their own cars from this one's parts. Nothing touches their
 * active build until they review the draft (see copyBuildAction). */
export function CopyBuildButton({
  sourceVehicleId,
  myVehicles,
}: {
  sourceVehicleId: string;
  myVehicles: Vehicle[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetId, setTargetId] = useState(myVehicles[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="glass-raised elev-1 rounded-[22px] p-5">
      <p className="text-[1.0625rem] font-semibold tracking-[-0.01em]">Like this build?</p>
      <p className="mt-1 text-[0.875rem] leading-relaxed text-muted">
        Copy its parts list onto one of your cars as a draft. You review
        what fits before anything is saved.
      </p>

      {!isOpen ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-4 h-10 w-full text-[0.9375rem] font-semibold"
          onClick={() => setIsOpen(true)}
        >
          Copy this build
        </Button>
      ) : myVehicles.length === 0 ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[16px] bg-foreground/[0.05] px-4 py-3">
          <p className="text-[0.875rem] text-muted">Add a vehicle first.</p>
          <Link href="/garage/new" className="text-[0.875rem] font-semibold text-accent">
            Add vehicle
          </Link>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {error && <p className="text-[0.8125rem] text-danger">{error}</p>}
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            aria-label="Copy onto"
            className="glass-inset h-11 w-full rounded-[14px] px-3 text-foreground focus:outline-none"
          >
            {myVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nickname || `${v.year} ${v.make} ${v.model}`}
              </option>
            ))}
          </select>
          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="secondary"
              className="h-10 flex-1 text-[0.9375rem] font-semibold"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isPending}
              className="h-10 flex-1 text-[0.9375rem] font-semibold"
              onClick={() =>
                startTransition(async () => {
                  const result = await copyBuildAction(sourceVehicleId, targetId);
                  if (result?.error) setError(result.error);
                })
              }
            >
              {isPending ? "Copying…" : "Copy"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
