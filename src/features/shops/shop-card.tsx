"use client";

import { useState } from "react";
import { PinIcon, StarIcon } from "@/components/ui/icons";
import { formatDistance } from "@/lib/geo/distance";
import { getShopCategory } from "@/lib/shops/categories";
import { createShopPromotionAction } from "@/features/shops/actions";
import { SHOP_PROMOTION_PRICE_CENTS } from "@/lib/db/shop-promotions";
import type { ShopCategoryId } from "@/lib/providers/places-provider";
import type { ShopResult } from "@/features/shops/actions";

function buildAppleMapsUrl(shop: ShopResult): string {
  const params = new URLSearchParams({ q: shop.name, ll: `${shop.lat},${shop.lng}` });
  return `https://maps.apple.com/?${params.toString()}`;
}

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
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  async function handlePromote(e: React.MouseEvent) {
    e.stopPropagation();
    setPromoteError(null);
    setIsPromoting(true);
    try {
      const { Capacitor } = await import("@capacitor/core");
      const isNative = Capacitor.isNativePlatform();
      const result = await createShopPromotionAction({
        placeId: shop.placeId,
        placeName: shop.name,
        isNative,
      });
      if (result.error || !result.url) {
        setPromoteError(result.error ?? "Couldn't start checkout. Try again.");
        return;
      }
      if (isNative) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: result.url });
      } else {
        window.location.href = result.url;
      }
    } catch {
      setPromoteError("Couldn't start checkout. Try again.");
    } finally {
      setIsPromoting(false);
    }
  }

  return (
    // A plain div, not an <a>, because it needs real nested interactive
    // elements inside it (the Google Maps link, the Promote button) —
    // neither an <a> nor a <button> can nest inside another <a>. The
    // div's own onClick does a real top-level navigation (not
    // window.open), the same as clicking a plain link would, which is
    // what lets iOS hand off to the native Maps app before this WebView
    // ever loads anything at maps.apple.com.
    <div
      role="link"
      tabIndex={0}
      onClick={() => {
        window.location.href = buildAppleMapsUrl(shop);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") window.location.href = buildAppleMapsUrl(shop);
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
              {shop.isPromoted && (
                <span className="flex-shrink-0 rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-accent-foreground">
                  Promoted
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

      {promoteError && <p className="text-xs text-danger">{promoteError}</p>}

      <div className="mt-1 flex items-center justify-between gap-3">
        <a
          href={shop.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-accent hover:underline"
        >
          Open in Google Maps
        </a>
        {!shop.isPromoted && (
          <button
            type="button"
            onClick={handlePromote}
            disabled={isPromoting}
            className="flex-shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-60"
          >
            {isPromoting ? "Starting…" : `Promote · $${(SHOP_PROMOTION_PRICE_CENTS / 100).toFixed(0)}`}
          </button>
        )}
      </div>
    </div>
  );
}
