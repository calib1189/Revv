"use client";

import { useState } from "react";
import { PosterThumb } from "@/features/posters/poster-card";
import type { PosterOffer } from "@/lib/posters/offer";
import type { RankTier } from "@/lib/rating/rank";
import { teePhotos3d, type TeeDesignId } from "@/lib/merch/products";

/** The neutral stage every product sits on in the shop. */
export const PRODUCT_STAGE = "bg-[radial-gradient(75%_60%_at_50%_35%,#3a3a42,#141417_78%)]";

/** The rank decal as Printful prints it: the die-cut sticker, white edge
 * and all, with a soft shadow. Nothing added on top. */
export function StickerArt({ tier, className = "" }: { tier: RankTier; className?: string }) {
  return (
    <span className={`block ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the sticker art, contained in its box */}
      <img src={`/decals/sticker/${tier}.png`} alt="" draggable={false} className="h-full w-full object-contain drop-shadow-[0_8px_14px_rgb(0_0_0/0.4)]" />
    </span>
  );
}

/**
 * The build poster exactly as it prints: the owner's own preview, drawn
 * by the same code that renders the print file (photo, score, rank and
 * every category score), small enough for a thumbnail. Shows the photo
 * and score while it draws, and keeps those if it can't.
 */
export function PosterPrint({ offer, width = 420, className = "" }: { offer: PosterOffer; width?: number; className?: string }) {
  const src = `/api/posters/preview?vehicle=${encodeURIComponent(offer.vehicleId)}&product=poster_18x24&w=${width}`;
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  return (
    <span className={`relative block aspect-[3/4] overflow-hidden rounded-[2px] bg-[#08080a] shadow-[0_14px_28px_-8px_rgb(0_0_0/0.6)] ${className}`}>
      {state !== "ready" && (
        <PosterThumb offer={offer} className={`absolute inset-0 h-full w-full rounded-none shadow-none ring-0 ${state === "loading" ? "animate-pulse" : ""}`} scoreClassName="text-[0.75rem]" />
      )}
      {state !== "failed" && (
        // eslint-disable-next-line @next/next/no-img-element -- rendered on demand by the poster preview route
        <img
          src={src}
          alt={`Build poster for ${offer.carName}`}
          draggable={false}
          onLoad={() => setState("ready")}
          onError={() => setState("failed")}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${state === "ready" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </span>
  );
}

/** A tee's front, floating with its shadow, for the shop grid. */
export function TeeStill({ design, alt, className = "" }: { design: TeeDesignId; alt: string; className?: string }) {
  const { front } = teePhotos3d(design);
  return (
    <div className={`relative ${className}`}>
      <div aria-hidden className="absolute bottom-[3%] left-1/2 h-[5%] w-[58%] -translate-x-1/2 rounded-[50%] bg-black/50 blur-[8px]" />
      {/* eslint-disable-next-line @next/next/no-img-element -- transparent cut-out */}
      <img src={front} alt={alt} draggable={false} className="relative h-full w-full object-contain" />
    </div>
  );
}
