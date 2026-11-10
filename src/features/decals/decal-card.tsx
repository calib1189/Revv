"use client";

import { useState } from "react";
import Image from "next/image";
import { startDecalOrderAction } from "@/features/decals/actions";
import { RANK_LABELS, RANK_TEXT_COLORS, type RankTier } from "@/lib/rating/rank";
import { formatUsd } from "@/lib/points/packs";

/** "Order your Diamond decal": a printed sticker of the rank this car
 * earned. Only rendered for the owner of an approved, rated car. */
export function DecalCard({
  vehicleId,
  tier,
  priceCents,
  justOrdered,
}: {
  vehicleId: string;
  tier: RankTier;
  priceCents: number;
  justOrdered: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = RANK_LABELS[tier];

  async function order() {
    setBusy(true);
    setError(null);
    const result = await startDecalOrderAction(vehicleId);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    window.location.assign(result.url);
  }

  return (
    <div className="glass-raised elev-1 flex items-center gap-4 rounded-[22px] p-4">
      <span className="relative h-24 w-24 flex-shrink-0">
        <Image src={`/decals/${tier}.png`} alt={`${label} rank decal`} fill sizes="192px" className="object-contain" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="micro-label" style={{ color: RANK_TEXT_COLORS[tier] }}>
          Earned: {label}
        </p>
        {justOrdered ? (
          <>
            <p className="mt-1 text-[1rem] font-semibold">Your decal is ordered</p>
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">
              You&apos;ll get an email when it ships.
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-[1rem] font-semibold">Rock your rank</p>
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">
              A 4 in. {label} vinyl decal for your car. {formatUsd(priceCents)}, free US shipping.
            </p>
            <button
              type="button"
              onClick={() => void order()}
              disabled={busy}
              className="pressable mt-3 h-10 rounded-full bg-accent px-4 text-[0.875rem] font-semibold text-accent-foreground disabled:opacity-60"
            >
              {busy ? "Opening checkout…" : `Order your ${label} decal`}
            </button>
            {error && <p className="mt-2 text-[0.8125rem] text-danger">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
