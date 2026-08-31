"use client";

import { useEffect, useMemo, useState } from "react";
import { ShopCard } from "@/features/shops/shop-card";
import { PromoteShopPanel } from "@/features/shops/promote-shop-panel";
import { MyPromotionsPanel } from "@/features/shops/my-promotions-panel";
import {
  searchNearbyShopsAction,
  searchShopsInLocationTextAction,
  type ShopResult,
} from "@/features/shops/actions";
import { SHOP_CATEGORIES, getShopCategory } from "@/lib/shops/categories";
import { SHOP_PROMOTION_TIER_RANK } from "@/lib/db/shop-promotions";
import { haversineMiles } from "@/lib/geo/distance";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShopCategoryId } from "@/lib/providers/places-provider";

type LocationState =
  | { status: "loading" }
  | { status: "ready"; coords: { lat: number; lng: number } }
  | { status: "denied" }
  /** A typed-in city/zip/address instead of geolocation — see
   * searchShopsInLocationTextAction. No coordinates, so results carry no
   * distance and can't be sorted by it. */
  | { status: "manual"; text: string };

export function ShopsBrowser() {
  const [location, setLocation] = useState<LocationState>({ status: "loading" });
  const [locationInput, setLocationInput] = useState("");
  const [category, setCategory] = useState<ShopCategoryId>(SHOP_CATEGORIES[0].id);
  const [shops, setShops] = useState<ShopResult[] | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPromotePanelOpen, setIsPromotePanelOpen] = useState(false);
  const [isMyPromotionsPanelOpen, setIsMyPromotionsPanelOpen] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      // Deferred to a microtask rather than called directly in the effect
      // body — same value either way, but avoids a synchronous setState
      // during the render-commit phase (same reasoning as
      // meetups-list.tsx's identical case).
      Promise.resolve().then(() => setLocation({ status: "denied" }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          status: "ready",
          coords: { lat: position.coords.latitude, lng: position.coords.longitude },
        });
      },
      () => setLocation({ status: "denied" }),
      { timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    if (location.status !== "ready" && location.status !== "manual") return;
    let cancelled = false;
    // Same microtask-deferral reasoning as above — resets to a loading
    // state for the new category/location before the fetch below
    // resolves, without setState synchronously in the effect body itself.
    Promise.resolve().then(() => {
      if (cancelled) return;
      setShops(null);
      setError(null);
      setIsRateLimited(false);
    });
    const search =
      location.status === "ready"
        ? searchNearbyShopsAction({ lat: location.coords.lat, lng: location.coords.lng, category })
        : searchShopsInLocationTextAction({ locationText: location.text, category });
    search
      .then((response) => {
        if (cancelled) return;
        setIsMock(response.isMock);
        setIsRateLimited(response.rateLimited);
        setShops(response.shops);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load shops. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [location, category]);

  const sorted = useMemo(() => {
    if (!shops) return [];
    return [...shops].sort((a, b) => {
      // Diamond, then Gold, then Silver, then everything else, always
      // ahead of distance — searchNearbyShopsAction already returns them
      // in this order, but re-sorting by pure distance below would
      // destroy that grouping if this comparator didn't check it first.
      const rankA = a.promotionTier ? SHOP_PROMOTION_TIER_RANK[a.promotionTier] : 0;
      const rankB = b.promotionTier ? SHOP_PROMOTION_TIER_RANK[b.promotionTier] : 0;
      if (rankA !== rankB) return rankB - rankA;

      if (location.status !== "ready") return 0;
      const { coords } = location;
      return (
        haversineMiles(coords, { lat: a.lat, lng: a.lng }) -
        haversineMiles(coords, { lat: b.lat, lng: b.lng })
      );
    });
  }, [shops, location]);

  function distanceFor(shop: ShopResult): number | null {
    if (location.status !== "ready") return null;
    return haversineMiles(location.coords, { lat: shop.lat, lng: shop.lng });
  }

  const categoryLabel = getShopCategory(category).label;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shops near you</h1>
          <p className="mt-1 text-sm text-muted">Mechanics, tint, body work — real local shops, real reviews.</p>
        </div>
        <div className="flex flex-shrink-0 gap-2 self-start">
          <button
            type="button"
            onClick={() => setIsMyPromotionsPanelOpen(true)}
            className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-white/[0.15]"
          >
            My promotions
          </button>
          <button
            type="button"
            onClick={() => setIsPromotePanelOpen(true)}
            className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-white/[0.15]"
          >
            Promote your shop
          </button>
        </div>
      </div>

      {isPromotePanelOpen && (
        <PromoteShopPanel
          coords={location.status === "ready" ? location.coords : null}
          onClose={() => setIsPromotePanelOpen(false)}
        />
      )}

      {isMyPromotionsPanelOpen && (
        <MyPromotionsPanel onClose={() => setIsMyPromotionsPanelOpen(false)} />
      )}

      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
        {SHOP_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              category === c.id ? "bg-accent text-accent-foreground" : "glass text-muted"
            }`}
          >
            <c.icon className="h-3.5 w-3.5" />
            {c.label}
          </button>
        ))}
      </div>

      {location.status === "loading" && <p className="text-sm text-muted">Finding your location…</p>}

      {location.status === "denied" && (
        <div className="glass flex flex-col items-center gap-3 rounded-2xl px-6 py-10 text-center">
          <p className="text-sm font-medium">Turn on location to see shops near you</p>
          <p className="max-w-xs text-xs text-muted">
            REVV needs your location to find local shops — check your device or browser settings.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = locationInput.trim();
              if (trimmed) setLocation({ status: "manual", text: trimmed });
            }}
            className="mt-2 flex w-full max-w-xs items-center gap-2"
          >
            <Input
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="City or zip code"
              aria-label="City or zip code"
            />
            <Button type="submit" className="flex-shrink-0 px-4 py-2.5 text-sm" disabled={!locationInput.trim()}>
              Search
            </Button>
          </form>
        </div>
      )}

      {location.status === "manual" && (
        <p className="mb-4 flex items-center justify-between gap-3 text-xs text-muted">
          <span>
            Showing results near <span className="font-medium text-foreground">{location.text}</span> — not sorted
            by distance.
          </span>
          <button
            type="button"
            onClick={() => setLocation({ status: "denied" })}
            className="flex-shrink-0 underline underline-offset-2 hover:text-foreground"
          >
            Change
          </button>
        </p>
      )}

      {(location.status === "ready" || location.status === "manual") && (
        <>
          {error && <Callout tone="danger">{error}</Callout>}

          {isMock && (
            <div className="glass flex flex-col items-center gap-2 rounded-2xl py-16 text-center">
              <p className="text-sm font-medium">Shops aren&apos;t set up yet</p>
              <p className="max-w-xs text-xs text-muted">
                This needs a Google Places connection REVV hasn&apos;t configured yet — check back
                soon.
              </p>
            </div>
          )}

          {!isMock && !error && shops === null && (
            <p className="text-sm text-muted">Loading shops…</p>
          )}

          {!isMock && !error && shops !== null && shops.length === 0 && isRateLimited && (
            <div className="glass flex flex-col items-center gap-2 rounded-2xl py-16 text-center">
              <p className="text-sm font-medium">You&apos;ve searched a lot just now</p>
              <p className="max-w-xs text-xs text-muted">
                Give it a few minutes and try again — this isn&apos;t a sign there are no real
                shops nearby.
              </p>
            </div>
          )}

          {!isMock && !error && shops !== null && shops.length === 0 && !isRateLimited && (
            <div className="glass flex flex-col items-center gap-2 rounded-2xl py-16 text-center">
              <p className="text-sm font-medium">No {categoryLabel.toLowerCase()} nearby</p>
              <p className="max-w-xs text-xs text-muted">Try a different category.</p>
            </div>
          )}

          {!isMock && shops !== null && shops.length > 0 && (
            <div className="flex flex-col gap-3">
              {sorted.map((shop) => (
                <ShopCard
                  key={shop.placeId}
                  shop={shop}
                  category={category}
                  distanceMiles={distanceFor(shop)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
