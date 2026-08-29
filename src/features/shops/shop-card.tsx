"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PinIcon, StarIcon, GemIcon } from "@/components/ui/icons";
import { formatDistance } from "@/lib/geo/distance";
import { getShopCategory } from "@/lib/shops/categories";
import { SHOP_PROMOTION_TIERS, type ShopPromotionTier } from "@/lib/db/shop-promotions";
import { RANK_TEXT_COLORS } from "@/lib/rating/rank";
import {
  recordShopPromotionImpressionAction,
  recordShopPromotionClickAction,
} from "@/features/shops/actions";
import type { ShopCategoryId } from "@/lib/providers/places-provider";
import type { ShopResult } from "@/features/shops/actions";

// Same silver/gold/diamond palette as components/ui/tier-picker.tsx —
// reused for color only, no functional link to the rank system.
const TIER_METAL_COLORS: Record<ShopPromotionTier, string> = {
  standard: RANK_TEXT_COLORS.silver,
  featured: RANK_TEXT_COLORS.gold,
  diamond: RANK_TEXT_COLORS.diamond,
};

export function ShopCard({
  shop,
  category,
  distanceMiles,
}: {
  shop: ShopResult;
  category: ShopCategoryId;
  distanceMiles: number | null;
}) {
  const { icon: CategoryIcon, label: categoryLabel } = getShopCategory(category);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRecordedImpression = useRef(false);
  const promotionTier = shop.promotionTier;
  const router = useRouter();

  // Impressions only matter for a promoted shop — an un-promoted card has
  // no spend behind it to measure. Same threshold/pattern as
  // sponsored-slide.tsx's ad impression tracking.
  useEffect(() => {
    if (!promotionTier) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          entry.intersectionRatio > 0.6 &&
          !hasRecordedImpression.current
        ) {
          hasRecordedImpression.current = true;
          recordShopPromotionImpressionAction(shop.placeId);
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [promotionTier, shop.placeId]);

  function recordClick() {
    if (promotionTier) recordShopPromotionClickAction(shop.placeId);
  }

  return (
    // A plain div, not an <a>, because it needs a real nested link
    // (Google Maps) inside it — two <a> tags can't nest in valid HTML.
    // Tapping the card itself now opens the shop's own REVV page (a
    // "profile visit", recorded server-side there) instead of jumping
    // straight to Maps — "Open in Google Maps" below is the fast-skip
    // path for someone who just wants directions.
    <div
      ref={containerRef}
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/discover/shop/${shop.placeId}?category=${category}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/discover/shop/${shop.placeId}?category=${category}`);
      }}
      className="glass flex cursor-pointer flex-col gap-2.5 rounded-2xl p-4 transition-opacity hover:opacity-90"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-raised text-accent">
            <CategoryIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{shop.name}</p>
              {shop.promotionTier && (
                <span
                  className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: `${TIER_METAL_COLORS[shop.promotionTier]}26`,
                    color: TIER_METAL_COLORS[shop.promotionTier],
                  }}
                >
                  <GemIcon className="h-2.5 w-2.5" />
                  {SHOP_PROMOTION_TIERS[shop.promotionTier].label}
                </span>
              )}
            </div>
            <p className="text-xs text-muted">{categoryLabel}</p>
          </div>
        </div>
        {distanceMiles != null && (
          <span className="flex-shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
            {formatDistance(distanceMiles)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {shop.rating != null && (
          <span className="flex items-center gap-1 text-foreground">
            <StarIcon className="h-3.5 w-3.5 text-accent" />
            <span className="font-medium">{shop.rating.toFixed(1)}</span>
            {shop.reviewCount != null && (
              <span className="text-muted">({shop.reviewCount})</span>
            )}
          </span>
        )}
        {shop.isOpenNow != null && (
          <span className={shop.isOpenNow ? "text-success" : "text-danger"}>
            {shop.isOpenNow ? "Open now" : "Closed"}
          </span>
        )}
      </div>

      {shop.address && (
        <div className="flex items-start gap-1.5 text-sm text-muted">
          <PinIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{shop.address}</span>
        </div>
      )}

      <a
        href={shop.googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.stopPropagation();
          recordClick();
        }}
        className="mt-1 self-start text-xs text-accent hover:underline"
      >
        Open in Google Maps
      </a>
    </div>
  );
}
