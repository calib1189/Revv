"use client";

import { useState } from "react";
import Link from "next/link";
import { CloseIcon, PinIcon, GemIcon } from "@/components/ui/icons";
import { searchShopsByQueryAction } from "@/features/shops/actions";
import { HANDOFF_BUTTON_CLASS, WebHandoffButton } from "@/features/auth/web-handoff-button";
import { useIsNative } from "@/lib/native/use-is-native";
import { SITE_URL } from "@/lib/site-url";
import { SHOP_PROMOTION_TIERS, type ShopPromotionTier } from "@/lib/db/shop-promotions";
import type { TierMetal } from "@/components/ui/tier-picker";
import { RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { Callout } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ShopResult } from "@/features/shops/actions";

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
const TIER_METALS: Record<ShopPromotionTier, TierMetal> = {
  standard: "silver",
  featured: "gold",
  diamond: "diamond",
};

/** "Promote your shop" — a free-text lookup instead of a Promote button
 * on every card. Someone finds their own business by name and picks it
 * from the results; searchShopsByQueryAction hits the same Places API
 * Text Search as category browsing, just with whatever they typed
 * instead of a fixed category keyword. The promoting itself (plan,
 * profile picture, payment) happens on that shop's own page — see
 * PromoteThisShop — so this only gets them there. */
export function PromoteShopPanel({
  coords,
  onClose,
}: {
  coords: { lat: number; lng: number } | null;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ShopResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ShopResult | null>(null);
  const isNative = useIsNative();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    if (!coords) {
      setSearchError(
        "Turn on location first so results can be matched near you.",
      );
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setResults(null);
    setSelected(null);
    try {
      const response = await searchShopsByQueryAction({
        lat: coords.lat,
        lng: coords.lng,
        query: trimmed,
      });
      if (response.isMock) {
        setSearchError("Shop lookup isn't set up yet — check back soon.");
        return;
      }
      if (response.rateLimited) {
        setSearchError(
          "You've searched a lot just now — give it a few minutes and try again.",
        );
        return;
      }
      setResults(response.shops);
    } catch {
      setSearchError("Couldn't search. Try again.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div className="glass-raised flex w-full flex-1 flex-col overflow-hidden sm:max-w-lg sm:flex-none sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-4">
          <h2 className="text-base font-semibold">Promote your shop</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-foreground"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:max-h-[60vh]">
          <form onSubmit={handleSearch} className="mb-4 flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Your shop's name"
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching} className="px-4">
              {isSearching ? "…" : "Search"}
            </Button>
          </form>

          {searchError && <Callout tone="danger">{searchError}</Callout>}

          {results !== null && results.length === 0 && !searchError && (
            <p className="text-sm text-muted">
              No matches — try a different search.
            </p>
          )}

          {results && results.length > 0 && (
            <div className="flex flex-col gap-2">
              {results.map((shop) => (
                <button
                  key={shop.placeId}
                  type="button"
                  onClick={() => setSelected(shop)}
                  className={`flex flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                    selected?.placeId === shop.placeId
                      ? "border-accent bg-accent/10"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{shop.name}</p>
                    {shop.promotionTier && (
                      <span
                        className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide"
                        style={{
                          backgroundColor: `${RANK_TEXT_COLORS[TIER_METALS[shop.promotionTier]]}26`,
                          color:
                            RANK_TEXT_COLORS[TIER_METALS[shop.promotionTier]],
                        }}
                      >
                        <GemIcon className="h-2.5 w-2.5" />
                        {SHOP_PROMOTION_TIERS[shop.promotionTier].label}
                      </span>
                    )}
                  </div>
                  {shop.address && (
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <PinIcon className="h-3 w-3 flex-shrink-0" />
                      {shop.address}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="flex flex-col gap-3 border-t border-white/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
            {selected.promotionTier === "diamond" ? (
              <p className="text-center text-sm text-muted">
                {selected.name} already has the top Diamond spot.
              </p>
            ) : isNative ? (
              // See createWebHandoffAction's doc comment — native never
              // shows plans, prices or a checkout. Picking the shop here is
              // the part worth keeping: the browser opens straight on that
              // shop's own page, scrolled to its Promote card.
              <WebHandoffButton
                nextPath={`/discover/shop/${encodeURIComponent(selected.placeId)}#promote`}
                label="Promote on the website"
                note={`Opens ${selected.name} on ${SITE_HOST}, already signed in.`}
              />
            ) : (
              <>
                <Link
                  href={`/discover/shop/${encodeURIComponent(selected.placeId)}#promote`}
                  className={`${HANDOFF_BUTTON_CLASS} w-full`}
                >
                  Continue
                </Link>
                <p className="text-center text-xs text-muted">
                  Opens {selected.name}&apos;s page, where you pick a plan and can add its
                  profile picture.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
