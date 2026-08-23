"use client";

import { useState, useTransition } from "react";
import { deleteVehicleAction } from "@/features/garage/actions";
import { Button } from "@/components/ui/button";

export function DeleteVehicleButton({ vehicleId }: { vehicleId: string }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isConfirming) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5">
        <span className="text-sm text-danger">Delete this vehicle?</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteVehicleAction(vehicleId))}
          className="text-sm font-medium text-danger underline underline-offset-2 disabled:opacity-60"
        >
          {isPending ? "Deleting…" : "Confirm"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setIsConfirming(false)}
          className="text-sm text-muted underline underline-offset-2"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="px-3 py-1.5 text-sm text-danger hover:bg-danger/10"
      onClick={() => setIsConfirming(true)}
    >
      Delete
    </Button>
  );
}
