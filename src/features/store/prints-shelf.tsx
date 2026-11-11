"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { DecalArt, DecalSheet, rankGlow, type DecalOffer } from "@/features/decals/decal-sheet";
import { PosterSheet, PosterThumb } from "@/features/posters/poster-card";
import type { PosterOffer } from "@/lib/posters/offer";
import { RANK_LABELS, RANK_TEXT_COLORS, type RankTier } from "@/lib/rating/rank";
import { formatScore } from "@/lib/rating/share-text";
import { formatUsd } from "@/lib/points/packs";
import { ChevronRightIcon } from "@/components/ui/icons";

interface PrintCar {
  vehicleId: string;
  carName: string;
  tier: RankTier;
  score: number;
  photoUrl: string | null;
  decal: DecalOffer | null;
  poster: PosterOffer | null;
}

/** Decals and posters grouped by car, best score first, so each car's
 * prints sit together. */
function byCar(decals: DecalOffer[], posters: PosterOffer[]): PrintCar[] {
  const cars = new Map<string, PrintCar>();
  for (const d of decals) {
    cars.set(d.vehicleId, { vehicleId: d.vehicleId, carName: d.carName, tier: d.tier, score: d.score, photoUrl: d.photoUrl, decal: d, poster: null });
  }
  for (const p of posters) {
    const car = cars.get(p.vehicleId);
    if (car) car.poster = p;
    else cars.set(p.vehicleId, { vehicleId: p.vehicleId, carName: p.carName, tier: p.tier, score: p.score, photoUrl: p.photoUrl, decal: null, poster: p });
  }
  return [...cars.values()].sort((a, b) => b.score - a.score);
}

const STAGE = "relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-[16px] bg-[#0c0c0f] ring-1 ring-white/[0.06]";

function PrintTile({ label, price, onOpen, children }: { label: string; price: string; onOpen: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onOpen} className="pressable flex min-w-0 flex-col text-left" aria-label={`${label}, ${price}`}>
      <span className={STAGE}>{children}</span>
      <span className="mt-2 flex w-full items-baseline justify-between gap-2 px-0.5">
        <span className="min-w-0 truncate text-[0.875rem] font-medium">{label}</span>
        <span className="numeral flex-shrink-0 text-[0.8125rem] text-muted">{price}</span>
      </span>
    </button>
  );
}

function CarPrints({ car, decalPriceCents }: { car: PrintCar; decalPriceCents: number }) {
  const [open, setOpen] = useState<"decal" | "poster" | null>(null);
  const posterFrom = car.poster ? Math.min(...car.poster.products.filter((p) => p.sharp).map((p) => p.priceCents)) : Infinity;

  return (
    <section className="flex flex-col gap-3" aria-label={`Prints for ${car.carName}`}>
      <div className="flex items-center gap-3 px-0.5">
        <span className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-foreground/[0.06]">
          {car.photoUrl && <Image src={car.photoUrl} alt="" fill sizes="40px" className="object-cover" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[0.9375rem] font-semibold">{car.carName}</span>
          <span className="block text-[0.75rem] text-muted">
            <span style={{ color: RANK_TEXT_COLORS[car.tier] }}>{RANK_LABELS[car.tier]}</span>
            {" · "}
            <span className="numeral">{formatScore(car.score)}</span>
          </span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
        {car.decal && (
          <PrintTile label={`${RANK_LABELS[car.tier]} decal`} price={formatUsd(decalPriceCents)} onOpen={() => setOpen("decal")}>
            <span className="absolute inset-0" style={{ background: rankGlow(car.tier, 26) }} />
            <DecalArt tier={car.tier} sizes="160px" className="relative aspect-square h-[78%]" />
          </PrintTile>
        )}
        {car.poster && (
          <PrintTile
            label="Poster"
            price={Number.isFinite(posterFrom) ? `From ${formatUsd(posterFrom)}` : "Photo too small"}
            onOpen={() => setOpen("poster")}
          >
            <PosterThumb offer={car.poster} className="aspect-[3/4] h-[80%]" scoreClassName="text-[0.6875rem]" />
          </PrintTile>
        )}
      </div>

      {car.decal && <DecalSheet offer={car.decal} priceCents={decalPriceCents} open={open === "decal"} onClose={() => setOpen(null)} />}
      {car.poster && <PosterSheet offer={car.poster} open={open === "poster"} onClose={() => setOpen(null)} />}
    </section>
  );
}

/** The store's Prints tab: real things for your car, printed and shipped,
 * grouped by car. Only cars that earned them (approved and rated) show
 * up; anyone without one yet gets told how to unlock them. */
export function PrintsShelf({ decals, posters, decalPriceCents }: { decals: DecalOffer[]; posters: PosterOffer[]; decalPriceCents: number }) {
  const cars = byCar(decals, posters);

  if (cars.length === 0) {
    return (
      <Link href="/garage" className="pressable flex items-center gap-4 rounded-[22px] bg-[#0c0c0f] p-3 pr-4 text-white ring-1 ring-white/[0.06]">
        <span className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-[16px] bg-white/[0.03]" style={{ backgroundImage: rankGlow("diamond", 28) }}>
          <DecalArt tier="diamond" sizes="160px" className="absolute inset-[6%]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[1.0625rem] font-semibold leading-tight">Prints for your car</span>
          <span className="mt-1 block text-[0.8125rem] leading-snug text-white/55">
            Get your car rated and approved to unlock its rank decal and build poster
          </span>
        </span>
        <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white/40" />
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="-mb-3 text-[0.875rem] text-muted">Printed for your car and shipped free in the US.</p>
      {cars.map((car) => (
        <CarPrints key={car.vehicleId} car={car} decalPriceCents={decalPriceCents} />
      ))}
    </div>
  );
}
