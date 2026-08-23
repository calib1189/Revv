"use client";

import { useState, useTransition } from "react";
import { startConversationAction } from "@/features/messages/actions";
import { Button } from "@/components/ui/button";

export function MessageButton({ userId }: { userId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        className="px-4 py-1.5 text-sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await startConversationAction(userId);
            if (result?.error) setError(result.error);
          })
        }
      >
        {isPending ? "…" : "Message"}
      </Button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
