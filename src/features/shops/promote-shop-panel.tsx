"use client";

import { useState } from "react";
import { CloseIcon, PinIcon } from "@/components/ui/icons";
import { searchShopsByQueryAction, createShopPromotionAction } from "@/features/shops/actions";
import { SHOP_PROMOTION_TIERS, type ShopPromotionTier } from "@/lib/db/shop-promotions";
import { Callout } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ShopResult } from "@/features/shops/actions";

const TIER_ORDER: ShopPromotionTier[] = ["standard", "featured"];

/** "Promote your shop" — a free-text lookup instead of a Promote button
 * on every card. Someone finds their own business by name, picks it from
 * the results, and pays from right here — searchShopsByQueryAction hits
 * the same Places API Text Search as category browsing, just with
 * whatever they typed instead of a fixed category keyword. */
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
  const [tier, setTier] = useState<ShopPromotionTier>("standard");
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    if (!coords) {
      setSearchError("Turn on location first so results can be matched near you.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setResults(null);
    setSelected(null);
    try {
      const response = await searchShopsByQueryAction({ lat: coords.lat, lng: coords.lng, query: trimmed });
      if (response.isMock) {
        setSearchError("Shop lookup isn't set up yet — check back soon.");
        return;
      }
      if (response.rateLimited) {
        setSearchError("You've searched a lot just now — give it a few minutes and try again.");
        return;
      }
      setResults(response.shops);
    } catch {
      setSearchError("Couldn't search. Try again.");
    } finally {
      setIsSearching(false);
    }
  }

  function selectShop(shop: ShopResult) {
    setSelected(shop);
    // Defaults to whichever tier is actually worth buying next — no
    // point defaulting to "standard" if it's already active.
    setTier(shop.promotionTier === "standard" ? "featured" : "standard");
  }

  async function handlePromote() {
    if (!selected) return;
    setPromoteError(null);
    setIsPromoting(true);
    try {
      const { Capacitor } = await import("@capacitor/core");
      const isNative = Capacitor.isNativePlatform();
      const result = await createShopPromotionAction({
        placeId: selected.placeId,
        placeName: selected.name,
        tier,
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
            <p className="text-sm text-muted">No matches — try a different search.</p>
          )}

          {results && results.length > 0 && (
            <div className="flex flex-col gap-2">
              {results.map((shop) => (
                <button
                  key={shop.placeId}
                  type="button"
                  onClick={() => selectShop(shop)}
                  className={`flex flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                    selected?.placeId === shop.placeId ? "border-accent bg-accent/10" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{shop.name}</p>
                    {shop.promotionTier && (
                      <span className="flex-shrink-0 rounded-full bg-accent px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-accent-foreground">
                        {shop.promotionTier === "featured" ? "Featured" : "Promoted"}
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
            {promoteError && <Callout tone="danger">{promoteError}</Callout>}

            {selected.promotionTier === "featured" ? (
              <p className="text-center text-sm text-muted">
                {selected.name} already has the top Featured spot.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  {TIER_ORDER.map((t) => {
                    const info = SHOP_PROMOTION_TIERS[t];
                    const alreadyActive = selected.promotionTier === t;
                    return (
                      <label
                        key={t}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors ${
                          tier === t ? "border-accent bg-accent/10" : "border-border"
                        } ${alreadyActive ? "opacity-50" : "cursor-pointer"}`}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="shop-promotion-tier"
                            checked={tier === t}
                            disabled={alreadyActive}
                            onChange={() => setTier(t)}
                          />
                          <span className="font-medium">{info.label}</span>
                        </span>
                        <span className="text-muted">
                          {alreadyActive ? "Already active" : `$${(info.priceCents / 100).toFixed(0)}`}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <Button type="button" onClick={handlePromote} disabled={isPromoting} className="w-full py-3">
                  {isPromoting
                    ? "Starting checkout…"
                    : `Promote ${selected.name} · $${(SHOP_PROMOTION_TIERS[tier].priceCents / 100).toFixed(0)}`}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
