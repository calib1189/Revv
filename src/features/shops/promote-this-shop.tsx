"use client";

import { useState } from "react";
import { createShopPromotionAction } from "@/features/shops/actions";
import {
  SHOP_PROMOTION_TIERS,
  SHOP_PROMOTION_TIER_RANK,
  SHOP_PROMOTION_DURATION_DAYS,
  type ShopPromotionTier,
} from "@/lib/db/shop-promotions";
import { TierPicker, type TierMetal } from "@/components/ui/tier-picker";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";

const TIER_ORDER: ShopPromotionTier[] = ["standard", "featured", "diamond"];
const TIER_METALS: Record<ShopPromotionTier, TierMetal> = {
  standard: "silver",
  featured: "gold",
  diamond: "diamond",
};

function nextWorthwhileTier(current: ShopPromotionTier | null): ShopPromotionTier {
  const currentRank = current ? SHOP_PROMOTION_TIER_RANK[current] : 0;
  return TIER_ORDER.find((t) => SHOP_PROMOTION_TIER_RANK[t] > currentRank) ?? "diamond";
}

/** Same tier-purchase flow as promote-shop-panel.tsx, minus the search
 * step — already on this exact shop's own page, so there's nothing to
 * look up first. Kept as its own component rather than sharing one with
 * the search panel: that one needs a result-list selection step this
 * one skips entirely, and forcing both shapes through one component
 * would need more branching than just having two small, honest ones. */
export function PromoteThisShop({
  placeId,
  placeName,
  currentTier,
  category,
}: {
  placeId: string;
  placeName: string;
  currentTier: ShopPromotionTier | null;
  /** The category this shop was browsed under to reach this page, if
   * any — captured so the promotion guarantees visibility in that
   * specific category browse (see searchNearbyShopsAction). Null when
   * this page was reached some other way (a direct link, a Details-page
   * revisit with no category in the URL). */
  category: string | null;
}) {
  const [tier, setTier] = useState<ShopPromotionTier>(nextWorthwhileTier(currentTier));
  const [isPromoting, setIsPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentTier === "diamond") {
    return (
      <p className="glass rounded-2xl p-4 text-center text-sm text-muted">
        {placeName} already has the top Diamond spot.
      </p>
    );
  }

  async function handlePromote() {
    setError(null);
    setIsPromoting(true);
    try {
      const { Capacitor } = await import("@capacitor/core");
      const isNative = Capacitor.isNativePlatform();
      const result = await createShopPromotionAction({ placeId, placeName, tier, category, isNative });
      if (result.error || !result.url) {
        setError(result.error ?? "Couldn't start checkout. Try again.");
        return;
      }
      if (isNative) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: result.url });
      } else {
        window.location.href = result.url;
      }
    } catch {
      setError("Couldn't start checkout. Try again.");
    } finally {
      setIsPromoting(false);
    }
  }

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-4">
      <h2 className="text-sm font-semibold">Promote {placeName}</h2>
      {error && <Callout tone="danger">{error}</Callout>}
      <TierPicker
        name="promote-this-shop-tier"
        value={tier}
        onChange={(id) => setTier(id as ShopPromotionTier)}
        options={TIER_ORDER.map((t) => {
          const alreadyActive = !!currentTier && SHOP_PROMOTION_TIER_RANK[t] <= SHOP_PROMOTION_TIER_RANK[currentTier];
          return {
            id: t,
            metal: TIER_METALS[t],
            priceCents: SHOP_PROMOTION_TIERS[t].priceCents,
            subtitle:
              t === "diamond"
                ? `Top-tier placement, ${SHOP_PROMOTION_DURATION_DAYS} days — sorts above every Gold and Silver listing`
                : t === "featured"
                  ? `${SHOP_PROMOTION_DURATION_DAYS} days — sorts above Silver listings`
                  : `${SHOP_PROMOTION_DURATION_DAYS} days — sorts above un-promoted shops`,
            disabled: alreadyActive,
            disabledReason: alreadyActive ? "Already active or below" : undefined,
          };
        })}
      />
      <Button type="button" onClick={handlePromote} disabled={isPromoting} className="w-full py-3">
        {isPromoting
          ? "Starting checkout…"
          : `Promote for ${SHOP_PROMOTION_DURATION_DAYS} days · $${(SHOP_PROMOTION_TIERS[tier].priceCents / 100).toFixed(0)}`}
      </Button>
    </div>
  );
}
