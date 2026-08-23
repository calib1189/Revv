"use client";

import { useState, useTransition } from "react";
import { getAffiliateLinkAction } from "@/features/parts/actions";
import { Button } from "@/components/ui/button";

export function BuyButton({ partId }: { partId: string }) {
  const [link, setLink] = useState<{ url: string; isMock: boolean } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  if (link) {
    return (
      <div className="flex flex-col items-start gap-1">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="text-sm font-medium text-accent hover:underline"
        >
          Open link
        </a>
        {link.isMock && (
          <span className="text-[11px] text-muted">
            Mock affiliate link — no real retailer connected
          </span>
        )}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className="px-3 py-1.5 text-sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await getAffiliateLinkAction(partId);
          if (result?.url) setLink({ url: result.url, isMock: result.isMock });
        })
      }
    >
      {isPending ? "…" : "Buy"}
    </Button>
  );
}
