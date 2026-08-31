"use client";

import { useState, useTransition } from "react";
import { getAffiliateLinkAction } from "@/features/parts/actions";
import { Button } from "@/components/ui/button";

export function BuyButton({
  partId,
  ownerAffiliateUrl,
}: {
  partId: string;
  /** The build_part owner's own affiliate link, if they added one — used
   * in place of REVV's own generated link when present, so the retailer
   * pays the owner directly instead of through REVV. No server round
   * trip needed for this case; the link is already known client-side. */
  ownerAffiliateUrl?: string | null;
}) {
  const [link, setLink] = useState<{ url: string; isOwnerLink: boolean; isMock: boolean } | null>(
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
        {link.isOwnerLink && (
          <span className="text-[11px] text-muted">Creator&apos;s own affiliate link</span>
        )}
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
      onClick={() => {
        if (ownerAffiliateUrl) {
          setLink({ url: ownerAffiliateUrl, isOwnerLink: true, isMock: false });
          return;
        }
        startTransition(async () => {
          const result = await getAffiliateLinkAction(partId);
          if (result?.url) setLink({ url: result.url, isOwnerLink: false, isMock: result.isMock });
        });
      }}
    >
      {isPending ? "…" : "Buy"}
    </Button>
  );
}
