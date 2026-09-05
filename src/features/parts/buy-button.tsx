"use client";

import { useState, useTransition } from "react";
import { getAffiliateLinkAction, recordPartClickAction } from "@/features/parts/actions";
import { Button } from "@/components/ui/button";

export function BuyButton({
  partId,
  ownerAffiliateUrl,
  buildPartId,
}: {
  partId: string;
  /** The build_part owner's own affiliate link, if they added one — used
   * in place of SORZA's own generated link when present, so the retailer
   * pays the owner directly instead of through SORZA. No server round
   * trip needed for this case; the link is already known client-side. */
  ownerAffiliateUrl?: string | null;
  /** Present only when this button is rendered against a specific
   * build_part (a build's own modification list) rather than the
   * general parts catalog browser — lets the build owner see how many
   * clicks their listed mod is getting. Omitted in the catalog browser,
   * where there's no build to attribute the click to. */
  buildPartId?: string;
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
        if (buildPartId) void recordPartClickAction(buildPartId);

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
