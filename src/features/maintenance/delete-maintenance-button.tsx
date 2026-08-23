"use client";

import { useState, useTransition } from "react";
import { deleteMaintenanceAction } from "@/features/maintenance/actions";

export function DeleteMaintenanceButton({
  recordId,
  vehicleId,
}: {
  recordId: string;
  vehicleId: string;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isConfirming) {
    return (
      <span className="inline-flex items-center gap-2 text-xs">
        <span className="text-danger">Delete?</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(() => deleteMaintenanceAction(recordId, vehicleId))
          }
          className="font-medium text-danger underline underline-offset-2"
        >
          {isPending ? "…" : "Yes"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setIsConfirming(false)}
          className="text-muted underline underline-offset-2"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsConfirming(true)}
      className="text-xs text-muted hover:text-danger"
    >
      Delete
    </button>
  );
}
