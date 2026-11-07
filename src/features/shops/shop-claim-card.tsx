"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { claimBusinessProfileAction } from "@/features/business/actions";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons";

export type ShopClaimState =
  | { kind: "anon" }
  | { kind: "claimable" }
  | {
      kind: "own";
      businessProfileId: string;
      status: "none" | "pending" | "approved" | "rejected";
    };

const OWN_STATUS: Record<"none" | "pending" | "rejected", { title: string; body: string }> = {
  none: {
    title: "Finish claiming your shop",
    body: "Send proof that it's yours, then add your photos, services and hours.",
  },
  pending: {
    title: "Your claim is in review",
    body: "You can set up your listing now. It goes live once you're verified.",
  },
  rejected: {
    title: "Your claim wasn't approved",
    body: "Send clearer proof that this shop is yours to try again.",
  },
};

/** "Own this shop?" on a shop's page: the way an owner finds out they can
 * claim it, or gets back to a claim they've started. */
export function ShopClaimCard({
  placeId,
  placeName,
  placeAddress,
  state,
}: {
  placeId: string;
  placeName: string;
  placeAddress: string | null;
  state: ShopClaimState;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (state.kind === "own") {
    if (state.status === "approved") {
      return (
        <Link
          href={`/settings/business/${state.businessProfileId}`}
          className="pressable glass-raised elev-1 flex items-center gap-3 rounded-[22px] px-5 py-4"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[0.9375rem] font-semibold">You manage this listing</p>
            <p className="mt-0.5 text-[0.8125rem] text-muted">Edit photos, services, hours and contact info.</p>
          </div>
          <span className="flex-shrink-0 rounded-full bg-accent px-4 py-2 text-[0.8125rem] font-semibold text-accent-foreground">
            Edit listing
          </span>
        </Link>
      );
    }
    const copy = OWN_STATUS[state.status];
    return (
      <Link
        href={`/settings/business/${state.businessProfileId}`}
        className="pressable glass-raised elev-1 flex items-center gap-3 rounded-[22px] px-5 py-4"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-semibold">{copy.title}</p>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">{copy.body}</p>
        </div>
        <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted" />
      </Link>
    );
  }

  const shopPath = `/discover/shop/${encodeURIComponent(placeId)}`;

  function handleClaim() {
    setError(null);
    startTransition(async () => {
      const result = await claimBusinessProfileAction({ placeId, placeName, placeAddress });
      if (result.error || !result.businessProfileId) {
        setError(result.error ?? "Couldn't claim this shop. Try again.");
        return;
      }
      router.push(`/settings/business/${result.businessProfileId}`);
    });
  }

  return (
    <section className="glass-raised elev-1 rounded-[22px] p-5">
      <p className="text-[0.9375rem] font-semibold">Own {placeName}?</p>
      <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
        Claim it for free. Add your own photos, services, hours and contact info, see how many people view
        your shop, and reply to reviews.
      </p>
      {state.kind === "anon" ? (
        <Link
          href={`/login?next=${encodeURIComponent(shopPath)}`}
          className="pressable mt-4 flex h-11 w-full items-center justify-center rounded-full bg-foreground/[0.08] text-[0.9375rem] font-semibold"
        >
          Log in to claim this shop
        </Link>
      ) : (
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={handleClaim}
          className="mt-4 h-11 w-full text-[0.9375rem] font-semibold"
        >
          {isPending ? "Claiming…" : "Claim this shop"}
        </Button>
      )}
      {error && <p className="mt-2 text-[0.8125rem] text-danger">{error}</p>}
    </section>
  );
}
