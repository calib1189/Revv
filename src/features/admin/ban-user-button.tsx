"use client";

import { useState, useTransition } from "react";
import { banUserAction } from "@/features/admin/actions";

export function BanUserButton({ userId }: { userId: string }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [banned, setBanned] = useState(false);

  if (banned) {
    return <span className="text-sm text-muted">Banned</span>;
  }

  if (isConfirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <span className="text-danger">Ban this account?</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await banUserAction(userId);
              setBanned(true);
            })
          }
          className="font-medium text-danger underline underline-offset-2 disabled:opacity-60"
        >
          {isPending ? "Banning…" : "Confirm"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setIsConfirming(false)}
          className="text-muted underline underline-offset-2"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsConfirming(true)}
      className="text-sm text-danger hover:underline"
    >
      Ban user
    </button>
  );
}
