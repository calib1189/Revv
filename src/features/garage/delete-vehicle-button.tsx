"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { deleteVehicleAction } from "@/features/garage/actions";
import { GroupedButtonRow, RowIcon } from "@/components/ui/grouped-list";
import { TrashIcon } from "@/components/ui/icons";

/** A destructive row in the vehicle page's owner list. First tap arms
 * it; the row then asks for confirmation inline rather than deleting on
 * a single tap. */
export function DeleteVehicleButton({ vehicleId }: { vehicleId: string }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="relative" style={{ "--row-inset": "3.625rem" } as CSSProperties}>
      {isConfirming ? (
        <div className="flex min-h-[48px] items-center gap-3 px-4 py-2.5">
          <RowIcon color="var(--danger)">
            <TrashIcon />
          </RowIcon>
          <p className="min-w-0 flex-1 text-[0.9375rem] text-danger">Delete this vehicle?</p>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setIsConfirming(false)}
            className="px-2 py-1 text-[0.875rem] font-medium text-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => deleteVehicleAction(vehicleId))}
            className="rounded-full bg-danger px-3.5 py-1.5 text-[0.875rem] font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      ) : (
        <GroupedButtonRow
          icon={
            <RowIcon color="var(--danger)">
              <TrashIcon />
            </RowIcon>
          }
          label="Delete vehicle"
          destructive
          onClick={() => setIsConfirming(true)}
        />
      )}
    </div>
  );
}
