"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { compShopPromotionAction, endCompedShopPromotionAction } from "@/features/shops/comp-actions";
import { SHOP_PROMOTION_TIERS, type ShopPromotionTier } from "@/lib/db/shop-promotions";
import { COMP_LENGTH_DAYS, type CompLengthDays } from "@/lib/shops/comp";
import { SHOP_CATEGORIES } from "@/lib/shops/categories";
import { TierPicker, type TierMetal } from "@/components/ui/tier-picker";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const TIER_ORDER: ShopPromotionTier[] = ["diamond", "featured", "standard"];
const TIER_METALS: Record<ShopPromotionTier, TierMetal> = {
  standard: "silver",
  featured: "gold",
  diamond: "diamond",
};
const TIER_SUBTITLES: Record<ShopPromotionTier, string> = {
  diamond: "Sorts above every other listing",
  featured: "Sorts above Silver and unpromoted listings",
  standard: "Sorts above unpromoted listings",
};

export interface LivePromotion {
  id: string;
  tier: ShopPromotionTier;
  endsAt: string;
  comped: boolean;
}

function formatEnds(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Admin-only: promote this shop for free, or end a free promotion early.
 * Shown only to admins (the page decides); the actions re-check. */
export function AdminCompCard({
  placeId,
  placeName,
  category: initialCategory,
  livePromotions,
}: {
  placeId: string;
  placeName: string;
  category: string | null;
  livePromotions: LivePromotion[];
}) {
  const [tier, setTier] = useState<ShopPromotionTier>("diamond");
  const [days, setDays] = useState<CompLengthDays>(90);
  const [category, setCategory] = useState(initialCategory ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleComp() {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const result = await compShopPromotionAction({
        placeId,
        placeName,
        tier,
        days,
        category: category || null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setDone(`${placeName} is promoted to ${SHOP_PROMOTION_TIERS[tier].label} for ${days} days, free.`);
      router.refresh();
    });
  }

  function handleEnd(promotionId: string) {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const result = await endCompedShopPromotionAction({ promotionId, placeId });
      if (result.error) {
        setError(result.error);
        return;
      }
      setDone("Free promotion ended.");
      router.refresh();
    });
  }

  return (
    <section className="glass-raised elev-1 flex flex-col gap-5 rounded-[22px] p-5">
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">Admin</p>
        <h2 className="mt-1 text-[1.0625rem] font-semibold">Promote for free</h2>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
          Shows to everyone exactly like a paid promotion. Only admins see this card.
        </p>
      </div>

      {livePromotions.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-[16px] bg-foreground/[0.04]">
          {livePromotions.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-semibold">
                  {SHOP_PROMOTION_TIERS[p.tier].label}
                  <span className="ml-2 text-[0.75rem] font-medium text-muted">{p.comped ? "Free" : "Paid"}</span>
                </p>
                <p className="mt-0.5 text-[0.8125rem] text-muted">Ends {formatEnds(p.endsAt)}</p>
              </div>
              {p.comped && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => handleEnd(p.id)}
                  className="h-9 px-4 py-0 text-[0.8125rem] font-semibold"
                >
                  End now
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <TierPicker
        name="admin-comp-tier"
        value={tier}
        onChange={(id) => setTier(id as ShopPromotionTier)}
        options={TIER_ORDER.map((t) => ({
          id: t,
          metal: TIER_METALS[t],
          priceCents: 0,
          priceLabel: "Free",
          subtitle: TIER_SUBTITLES[t],
        }))}
      />

      <div>
        <Label>How long</Label>
        <SegmentedControl
          value={String(days)}
          onChange={(v) => setDays(Number(v) as CompLengthDays)}
          options={COMP_LENGTH_DAYS.map((d) => ({ value: String(d), label: `${d} days` }))}
        />
      </div>

      <div>
        <Label htmlFor="admin-comp-category">Show at the top of</Label>
        <select
          id="admin-comp-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="glass-inset w-full rounded-[14px] px-4 py-3 text-foreground transition-[box-shadow,border-color] focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/15"
        >
          <option value="">Every category</option>
          {SHOP_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <Button type="button" disabled={isPending} onClick={handleComp} className="h-11 w-full text-[0.9375rem] font-semibold">
        {isPending ? "Working…" : `Promote ${placeName} for free`}
      </Button>

      {error && <p className="text-[0.8125rem] text-danger">{error}</p>}
      {done && <p className="text-[0.8125rem] text-success">{done}</p>}
    </section>
  );
}
