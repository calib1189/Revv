"use client";

import { useState, useTransition } from "react";
import { createCheckoutSessionAction } from "@/features/billing/actions";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";

export function SubscribeButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      {error && (
        <div className="mb-3">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}
      <Button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await createCheckoutSessionAction();
            if (result?.error) setError(result.error);
          })
        }
      >
        {isPending ? "Starting checkout…" : "Subscribe"}
      </Button>
    </div>
  );
}
