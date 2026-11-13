"use client";

import { useRef, useState } from "react";
import { PosterThumb } from "@/features/posters/poster-card";
import type { PosterOffer } from "@/lib/posters/offer";
import { RANK_TEXT_COLORS, type RankTier } from "@/lib/rating/rank";
import { teePhotos3d, type TeeDesignId } from "@/lib/merch/products";

const maskFor = (src: string) => ({
  WebkitMaskImage: `url(${src})`,
  maskImage: `url(${src})`,
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
});

/**
 * The rank decal as the real thing: Printful's die-cut sticker (white
 * edge and all) with a glossy vinyl sheen. It tilts toward your finger
 * when `interactive`, and otherwise floats gently.
 */
export function GlossySticker({ tier, interactive = false, className = "" }: { tier: RankTier; interactive?: boolean; className?: string }) {
  const src = `/decals/sticker/${tier}.png`;
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  function follow(e: React.PointerEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -ny * 22, y: nx * 26 });
  }

  const glossAt = 50 + tilt.y * 2.2;
  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{ perspective: 700 }}
      onPointerMove={interactive ? follow : undefined}
      onPointerDown={interactive ? follow : undefined}
      onPointerLeave={interactive ? () => setTilt({ x: 0, y: 0 }) : undefined}
    >
      <div
        className={`relative h-full w-full transition-transform duration-200 ease-out ${interactive ? "" : "animate-sticker-float"}`}
        style={interactive ? { transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transformStyle: "preserve-3d" } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- the sticker art, contained in its box */}
        <img src={src} alt="" draggable={false} className="h-full w-full object-contain drop-shadow-[0_10px_16px_rgb(0_0_0/0.45)]" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            ...maskFor(src),
            backgroundImage: `linear-gradient(115deg, transparent ${glossAt - 22}%, rgb(255 255 255 / 0.38) ${glossAt - 4}%, rgb(255 255 255 / 0.08) ${glossAt + 6}%, transparent ${glossAt + 20}%)`,
          }}
        />
      </div>
    </div>
  );
}

/** A soft pool of the rank's own color behind its sticker. */
export function stickerStage(tier: RankTier): React.CSSProperties {
  return {
    backgroundImage: `radial-gradient(60% 55% at 50% 45%, color-mix(in srgb, ${RANK_TEXT_COLORS[tier]} 26%, transparent), transparent 75%), linear-gradient(180deg, #17171b, #0b0b0d)`,
  };
}

/** The build poster, framed and hung: black frame, white mat, a slight
 * angle and a shadow on the wall. */
export function FramedPoster({ offer, className = "" }: { offer: PosterOffer; className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ perspective: 900 }}>
      <div
        className="relative h-full w-full rounded-[3px] bg-[#0b0b0c] p-[5%] shadow-[18px_22px_30px_-8px_rgb(0_0_0/0.65)] ring-1 ring-white/10"
        style={{ transform: "rotateY(-14deg) rotateX(3deg)", transformStyle: "preserve-3d" }}
      >
        <div className="h-full w-full bg-[#f3f1ec] p-[7%]">
          <PosterThumb offer={offer} className="h-full w-full rounded-none shadow-none ring-0" scoreClassName="text-[0.75rem]" />
        </div>
        {/* Glass. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgb(255_255_255/0.14),transparent_38%)]" />
      </div>
    </div>
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
