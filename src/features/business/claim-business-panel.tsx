"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon, PinIcon } from "@/components/ui/icons";
import { searchShopsByQueryAction, type ShopResult } from "@/features/shops/actions";
import { claimBusinessProfileAction } from "@/features/business/actions";
import { Callout } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** "Claim a business" — the same free-text Places lookup as "Promote your
 * shop" (promote-shop-panel.tsx), just ending in a free claim instead of a
 * paid promotion. Self-contained geolocation (create-meetup-form.tsx's
 * pattern) rather than a coords prop, since this has no parent that
 * already owns a location request the way the Discover header does for
 * promoting. */
export function ClaimBusinessPanel({ onClose }: { onClose: () => void }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "denied">("idle");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ShopResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ShopResult | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const router = useRouter();

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus("idle");
      },
      () => setLocationStatus("denied"),
      { timeout: 8000 },
    );
  }

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
        setSearchError("Business lookup isn't set up yet — check back soon.");
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

  async function handleClaim() {
    if (!selected) return;
    setClaimError(null);
    setIsClaiming(true);
    try {
      const result = await claimBusinessProfileAction({
        placeId: selected.placeId,
        placeName: selected.name,
        placeAddress: selected.address || null,
      });
      if (result.error || !result.businessProfileId) {
        setClaimError(result.error ?? "Couldn't claim that business. Try again.");
        return;
      }
      router.push(`/settings/business/${result.businessProfileId}`);
    } catch {
      setClaimError("Couldn't claim that business. Try again.");
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div className="glass-raised flex w-full flex-1 flex-col overflow-hidden sm:max-w-lg sm:flex-none sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-4">
          <h2 className="text-base font-semibold">Claim a business</h2>
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
          {!coords ? (
            <div className="mb-4">
              <Button
                type="button"
                variant="secondary"
                className="w-full px-3 py-2.5 text-sm"
                onClick={handleUseLocation}
                disabled={locationStatus === "loading"}
              >
                {locationStatus === "loading" ? "Getting location…" : "Use my current location"}
              </Button>
              {locationStatus === "denied" && (
                <p className="mt-1.5 text-xs text-danger">
                  Couldn&apos;t get your location — turn it on and try again.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSearch} className="mb-4 flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Your business's name"
                className="flex-1"
              />
              <Button type="submit" disabled={isSearching} className="px-4">
                {isSearching ? "…" : "Search"}
              </Button>
            </form>
          )}

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
                  onClick={() => setSelected(shop)}
                  className={`flex flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                    selected?.placeId === shop.placeId ? "border-accent bg-accent/10" : "border-border"
                  }`}
                >
                  <p className="font-medium">{shop.name}</p>
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
            {claimError && <Callout tone="danger">{claimError}</Callout>}
            <Button type="button" onClick={handleClaim} disabled={isClaiming} className="w-full py-3">
              {isClaiming ? "Claiming…" : `Claim ${selected.name}`}
            </Button>
            <p className="text-center text-xs text-muted">
              You&apos;ll need to verify you run this business before your changes go live.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
