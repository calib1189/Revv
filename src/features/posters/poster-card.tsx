"use client";

import { useState } from "react";
import Image from "next/image";
import { Sheet } from "@/components/ui/sheet";
import { startPosterOrderAction } from "@/features/posters/actions";
import type { PosterOffer } from "@/lib/posters/offer";
import type { PosterProductId } from "@/lib/posters/products";
import { formatUsd } from "@/lib/points/packs";
import { formatScore } from "@/lib/rating/share-text";

const SHAPE: Record<PosterProductId, string> = {
  poster_12x16: "aspect-[3/4]",
  poster_18x24: "aspect-[3/4]",
  framed_12x18: "aspect-[2/3]",
};

/** Each size drawn to scale against the others, in the size picker. */
const ICON: Record<PosterProductId, string> = {
  poster_12x16: "h-7 w-[21px] bg-foreground/25",
  poster_18x24: "h-9 w-[27px] bg-foreground/25",
  framed_12x18: "h-9 w-6 border-[3px] border-foreground/80",
};

/** "Build poster": the owner's car on a printed poster with its SORZA
 * score. Tapping it opens the live preview, the sizes and the order
 * button. Only rendered for the owner of an approved, rated car with a
 * cover photo. */
export function PosterCard({ offer, justOrdered = false }: { offer: PosterOffer; justOrdered?: boolean }) {
  const [open, setOpen] = useState(false);
  const from = Math.min(...offer.products.filter((p) => p.sharp).map((p) => p.priceCents));
  const orderable = Number.isFinite(from);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pressable flex w-full items-center gap-4 rounded-[22px] bg-[#0c0c0f] p-3 pr-4 text-left text-white ring-1 ring-white/[0.06]"
        aria-label={`View your build poster for ${offer.carName}`}
      >
        <span className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-white/[0.03]">
          <PosterThumb offer={offer} className="h-[68px] w-[51px]" scoreClassName="text-[0.625rem]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[1.0625rem] font-semibold leading-tight">{justOrdered ? "Poster ordered" : "Build poster"}</span>
          <span className="mt-1 block truncate text-[0.8125rem] text-white/55">
            {justOrdered ? "You'll get an email when it ships" : `For ${offer.carName}`}
          </span>
        </span>
        {!justOrdered && orderable && (
          <span className="numeral flex-shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[0.875rem] font-bold text-black">{formatUsd(from)}</span>
        )}
      </button>
      <PosterSheet offer={offer} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** A tiny poster: the car on top, the score on the dark band. Size it
 * with `className` (3:4). */
export function PosterThumb({ offer, className, scoreClassName }: { offer: PosterOffer; className: string; scoreClassName: string }) {
  return (
    <span className={`relative block overflow-hidden rounded-[3px] bg-[#08080a] shadow-[0_6px_14px_rgb(0_0_0/0.5)] ring-1 ring-white/10 ${className}`}>
      <Image src={offer.photoUrl} alt="" fill sizes="160px" className="object-cover object-[50%_40%]" />
      <span className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#08080a] via-[#08080a]/90 to-transparent" />
      <span className={`numeral absolute bottom-[8%] left-[8%] font-bold leading-none text-white ${scoreClassName}`}>{formatScore(offer.score)}</span>
    </span>
  );
}

/**
 * The poster before buying it, laid out like the shop's other sheets:
 * the real print (drawn by the same code that renders the print file)
 * hanging on a wall, framed if you pick the framed one; then the two
 * sizes side by side, and Buy.
 */
export function PosterSheet({ offer, open, onClose }: { offer: PosterOffer; open: boolean; onClose: () => void }) {
  const firstSharp = offer.products.find((p) => p.sharp) ?? null;
  const [productId, setProductId] = useState<PosterProductId | null>(firstSharp?.id ?? null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const product = offer.products.find((p) => p.id === productId) ?? null;
  const previewId = product?.id ?? offer.products[0].id;
  const framed = previewId === "framed_12x18";
  const src = `/api/posters/preview?vehicle=${encodeURIComponent(offer.vehicleId)}&product=${previewId}`;

  async function order() {
    if (!product) return;
    setBusy(true);
    setError(null);
    const result = await startPosterOrderAction(offer.vehicleId, product.id);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    window.location.assign(result.url);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Build poster">
      <div className="flex flex-col gap-5">
        {/* The wall. */}
        <div className="relative flex justify-center overflow-hidden rounded-[28px] bg-[radial-gradient(80%_70%_at_50%_30%,#4a4a52,#1b1b1f_75%)] px-10 py-8">
          <div
            className={`relative w-full max-w-[200px] transition-[padding,background-color] duration-300 ${
              framed ? "bg-[#0b0b0c] p-[6%] shadow-[0_26px_44px_-12px_rgb(0_0_0/0.75)] ring-1 ring-white/10" : "shadow-[0_22px_40px_-14px_rgb(0_0_0/0.7)]"
            }`}
          >
            <div className={framed ? "bg-[#f3f1ec] p-[7%]" : ""}>
              <div className={`relative w-full overflow-hidden bg-[#08080a] ${SHAPE[previewId]}`}>
                {failed === src ? (
                  <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-[0.8125rem] text-white/60">
                    Couldn&apos;t draw your poster. Close this and try again.
                  </p>
                ) : (
                  <>
                    {loaded !== src && (
                      <span className="absolute inset-0 flex animate-pulse items-center justify-center text-[0.8125rem] text-white/50">
                        Making your poster…
                      </span>
                    )}
                    <Image
                      key={src}
                      src={src}
                      alt={`Your build poster for ${offer.carName}`}
                      fill
                      unoptimized
                      sizes="200px"
                      onLoad={() => setLoaded(src)}
                      onError={() => setFailed(src)}
                      className={`object-cover transition-opacity duration-300 ${loaded === src ? "opacity-100" : "opacity-0"}`}
                    />
                  </>
                )}
              </div>
            </div>
            {/* Glass, on the framed one. */}
            {framed && <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgb(255_255_255/0.12),transparent_40%)]" />}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[1.375rem] font-bold tracking-[-0.02em]">Build poster</p>
            {product && <p className="numeral flex-shrink-0 text-[1.25rem] font-bold">{formatUsd(product.priceCents)}</p>}
          </div>
          <p className="mt-1 truncate text-[0.8125rem] text-muted">
            {offer.carName} · <span className="numeral">{formatScore(offer.score)}</span> SORZA score
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Poster size">
          {offer.products.map((p) => {
            const selected = p.id === productId;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!p.sharp}
                onClick={() => setProductId(p.id)}
                className={`pressable flex flex-col items-start gap-2 rounded-[18px] p-3 text-left ring-1 transition-colors disabled:opacity-45 ${
                  selected ? "bg-foreground/[0.07] ring-2 ring-foreground" : "bg-foreground/[0.03] ring-border"
                }`}
              >
                <span className="flex h-9 items-end">
                  <span
                    className={`block ${ICON[p.id]} rounded-[2px]`}
                    aria-hidden
                  />
                </span>
                <span>
                  <span className="block text-[0.9375rem] font-semibold">{p.name}</span>
                  <span className="block text-[0.75rem] leading-snug text-muted">{p.sharp ? p.detail : "Your cover photo is too small for this size"}</span>
                </span>
                <span className="numeral text-[0.9375rem] font-bold">{formatUsd(p.priceCents)}</span>
              </button>
            );
          })}
        </div>

        {!offer.categoryScores && (
          <p className="-mt-2 rounded-[14px] bg-foreground/[0.05] px-3.5 py-2.5 text-[0.8125rem] leading-snug text-muted">
            This rating is from before category scores, so they aren&apos;t on the poster. Re-rate your car to add them.
          </p>
        )}

        {product ? (
          <div>
            <button
              type="button"
              onClick={() => void order()}
              disabled={busy}
              className="pressable h-[52px] w-full rounded-full bg-accent text-[1rem] font-semibold text-accent-foreground disabled:opacity-55"
            >
              {busy ? "Opening checkout…" : `Buy now · ${formatUsd(product.priceCents)}`}
            </button>
            <p className="mt-2 text-center text-[0.75rem] text-muted">Printed as rated · Free US shipping</p>
            {error && <p className="mt-2 text-center text-[0.8125rem] text-danger">{error}</p>}
          </div>
        ) : (
          <p className="text-center text-[0.875rem] text-muted">
            Your cover photo is too small to print sharp. Add a higher-resolution cover photo to order a poster.
          </p>
        )}
      </div>
    </Sheet>
  );
}
