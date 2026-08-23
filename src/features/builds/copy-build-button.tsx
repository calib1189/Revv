"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { copyBuildAction } from "@/features/builds/copy-build-actions";
import { Button } from "@/components/ui/button";
import type { Vehicle } from "@/lib/db/vehicles";

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

  if (myVehicles.length === 0) {
    if (!isOpen) {
      return (
        <Button
          type="button"
          variant="secondary"
          className="px-3 py-1.5 text-sm"
          onClick={() => setIsOpen(true)}
        >
          Copy this build
        </Button>
      );
    }
    return (
      <div className="glass rounded-xl px-3.5 py-2.5 text-sm">
        <p className="text-muted">
          Add a vehicle first to copy this build onto it.
        </p>
        <Link href="/garage/new" className="text-accent hover:underline">
          Add a vehicle
        </Link>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="secondary"
        className="px-3 py-1.5 text-sm"
        onClick={() => setIsOpen(true)}
      >
        Copy this build
      </Button>
    );
  }

  return (
    <div className="glass flex flex-col gap-2 rounded-xl p-3">
      {error && <p className="text-xs text-danger">{error}</p>}
      <select
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        className="glass-inset w-full rounded-lg px-2 py-1.5 text-sm text-foreground transition-colors focus:border-accent/60 focus:outline-none"
      >
        {myVehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.nickname || `${v.year} ${v.make} ${v.model}`}
          </option>
        ))}
      </select>
      <div className="flex gap-3">
        <Button
          type="button"
          disabled={isPending}
          className="px-3 py-1.5 text-sm"
          onClick={() =>
            startTransition(async () => {
              const result = await copyBuildAction(sourceVehicleId, targetId);
              if (result?.error) setError(result.error);
            })
          }
        >
          {isPending ? "Copying…" : "Copy to this vehicle"}
        </Button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
