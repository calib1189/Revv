"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import { Sheet } from "@/components/ui/sheet";
import { PRODUCT_STAGE, StickerArt } from "@/features/shop/product-art";
import { startDecalOrderAction } from "@/features/decals/actions";
import { RANK_LABELS, RANK_TEXT_COLORS, type RankTier } from "@/lib/rating/rank";
import { formatScore } from "@/lib/rating/share-text";
import { formatUsd } from "@/lib/points/packs";

/** Everything needed to show and order one car's rank decal. */
export interface DecalOffer {
  vehicleId: string;
  tier: RankTier;
  score: number;
  carName: string;
  /** The car's cover photo, for the "On your car" preview. */
  photoUrl: string | null;
}

/** Starts the Stripe checkout for a car's decal. The server re-checks
 * that the viewer owns the car and that it earned this rank. */
export function useDecalOrder(vehicleId: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function order() {
    setBusy(true);
    setError(null);
    const result = await startDecalOrderAction(vehicleId);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    window.location.assign(result.url);
  }

  return { busy, error, order };
}

/** The sticker as Printful prints it: the rank badge, die-cut with a
 * thin white edge around it. These are Printful's own mockups of the
 * print files (public/decals/sticker), so what people see is what
 * arrives. `className` must position and size it. */
export function DecalArt({ tier, className, sizes = "(min-width: 640px) 320px, 70vw" }: { tier: RankTier; className: string; sizes?: string }) {
  return (
    <span className={`block ${className}`}>
      <Image
        src={`/decals/sticker/${tier}.png`}
        alt={`${RANK_LABELS[tier]} rank sticker`}
        fill
        sizes={sizes}
        className="object-contain drop-shadow-[0_8px_18px_rgb(0_0_0/0.45)]"
      />
    </span>
  );
}

/** A soft wash of the rank's color behind the decal. */
export function rankGlow(tier: RankTier, strength = 22): string {
  return `radial-gradient(55% 50% at 50% 45%, color-mix(in srgb, ${RANK_TEXT_COLORS[tier]} ${strength}%, transparent), transparent 80%)`;
}

const MIN_SIZE = 10;
const MAX_SIZE = 60;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * The decal on the owner's own car photo: drag it where it would go,
 * pinch (or use the slider) to size it. Position and size are in % of
 * the photo, so it holds its place at any screen size.
 */
function DecalOnCar({ tier, photoUrl, carName }: { tier: RankTier; photoUrl: string; carName: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; size: number } | null>(null);
  const [pos, setPos] = useState({ x: 70, y: 66 });
  const [size, setSize] = useState(24);
  const [moved, setMoved] = useState(false);

  function distance() {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) pinch.current = { distance: distance(), size };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const prev = pointers.current.get(e.pointerId);
    const rect = stage.current?.getBoundingClientRect();
    if (!prev || !rect) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinch.current && distance() > 0) {
      const start = pinch.current;
      setSize(clamp((start.size * distance()) / start.distance, MIN_SIZE, MAX_SIZE));
    } else if (pointers.current.size === 1) {
      const dx = ((e.clientX - prev.x) / rect.width) * 100;
      const dy = ((e.clientY - prev.y) / rect.height) * 100;
      setPos((p) => ({ x: clamp(p.x + dx, 4, 96), y: clamp(p.y + dy, 4, 96) }));
    }
    setMoved(true);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative aspect-square w-full cursor-grab touch-none select-none overflow-hidden rounded-[24px] bg-[#0c0c0f] active:cursor-grabbing"
        aria-label="Drag the decal to place it on your car"
      >
        <Image src={photoUrl} alt={carName} fill sizes="(min-width: 640px) 480px, 100vw" className="pointer-events-none object-cover" draggable={false} />
        {/* Positioned by inline style so it follows the finger. */}
        <span
          aria-hidden
          className="pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${size}%` }}
        >
          <DecalArt tier={tier} sizes="(min-width: 640px) 240px, 50vw" className="absolute inset-0" />
        </span>
        <span
          className={`pointer-events-none absolute inset-x-0 bottom-3 flex justify-center transition-opacity duration-500 ${moved ? "opacity-0" : "opacity-100"}`}
        >
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-[0.75rem] font-semibold text-white backdrop-blur-md">
            Drag to place it · pinch to resize
          </span>
        </span>
      </div>
      <label className="flex items-center gap-3 px-1 text-[0.8125rem] font-medium text-muted">
        Size
        <input
          type="range"
          min={MIN_SIZE}
          max={MAX_SIZE}
          step={1}
          value={Math.round(size)}
          onChange={(e) => {
            setSize(Number(e.target.value));
            setMoved(true);
          }}
          className="h-1 flex-1 cursor-pointer accent-accent"
          aria-label="Decal size"
        />
      </label>
    </div>
  );
}

/**
 * The decal before buying it, laid out like the shop's other sheets: the
 * sticker on a stage glowing in its rank's color (tilt it with your
 * finger), or placed on the car's own photo; then the name, the price,
 * what it's made of, and Buy.
 */
export function DecalSheet({
  offer,
  priceCents,
  open,
  onClose,
}: {
  offer: DecalOffer;
  priceCents: number;
  open: boolean;
  onClose: () => void;
}) {
  const [view, setView] = useState<"decal" | "car">("decal");
  const { busy, error, order } = useDecalOrder(offer.vehicleId);
  const label = RANK_LABELS[offer.tier];
  const color = RANK_TEXT_COLORS[offer.tier];

  return (
    <Sheet open={open} onClose={onClose} title={`${label} decal`}>
      <div className="flex flex-col gap-5">
        <div className={`relative overflow-hidden rounded-[28px] p-4 pb-4 ${PRODUCT_STAGE}`}>
          {view === "car" && offer.photoUrl ? (
            <DecalOnCar tier={offer.tier} photoUrl={offer.photoUrl} carName={offer.carName} />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center">
              <StickerArt tier={offer.tier} className="h-[74%] w-[74%]" />
            </div>
          )}
          {offer.photoUrl && (
            <div className="mt-3 flex justify-center gap-1 rounded-full bg-black/35 p-1 backdrop-blur-md" role="radiogroup" aria-label="View">
              {(
                [
                  ["decal", "Sticker"],
                  ["car", "On your car"],
                ] as const
              ).map(([v, text]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={view === v}
                  onClick={() => setView(v)}
                  className={`pressable rounded-full px-4 py-1.5 text-[0.8125rem] font-semibold transition-colors ${
                    view === v ? "bg-white text-black" : "text-white/70"
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[1.375rem] font-bold tracking-[-0.02em]">{label} rank decal</p>
            <p className="numeral flex-shrink-0 text-[1.25rem] font-bold">{formatUsd(priceCents)}</p>
          </div>
          <p className="mt-1 flex items-center gap-2 truncate text-[0.8125rem] text-muted">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: color }} />
            Earned by {offer.carName} · <span className="numeral">{formatScore(offer.score)}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["4 × 4 in.", "Die-cut", "Weatherproof vinyl"].map((spec) => (
              <span key={spec} className="rounded-full bg-foreground/[0.06] px-3 py-1 text-[0.75rem] font-semibold text-foreground/80 ring-1 ring-border">
                {spec}
              </span>
            ))}
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => void order()}
            disabled={busy}
            className="pressable h-[52px] w-full rounded-full bg-accent text-[1rem] font-semibold text-accent-foreground disabled:opacity-55"
          >
            {busy ? "Opening checkout…" : `Buy now · ${formatUsd(priceCents)}`}
          </button>
          <p className="mt-2 text-center text-[0.75rem] text-muted">Printed to order · Free US shipping</p>
          {error && <p className="mt-2 text-center text-[0.8125rem] text-danger">{error}</p>}
        </div>
      </div>
    </Sheet>
  );
}
