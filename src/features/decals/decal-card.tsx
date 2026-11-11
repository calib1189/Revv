"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { DecalArt, DecalSheet, rankGlow, type DecalOffer } from "@/features/decals/decal-sheet";
import { RANK_LABELS } from "@/lib/rating/rank";
import { formatUsd } from "@/lib/points/packs";
import { ChevronRightIcon } from "@/components/ui/icons";

/** "Diamond decal, $14.99": the printed sticker of the rank this car
 * earned. Tapping it opens the full view and the order button. Only
 * rendered for the owner of an approved, rated car. */
export function DecalCard({
  offer,
  priceCents,
  justOrdered = false,
}: {
  offer: DecalOffer;
  priceCents: number;
  justOrdered?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = RANK_LABELS[offer.tier];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pressable flex w-full items-center gap-4 rounded-[22px] bg-[#0c0c0f] p-3 pr-4 text-left text-white ring-1 ring-white/[0.06]"
        aria-label={`View your ${label} decal`}
      >
        <span className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-[16px] bg-white/[0.03]" style={{ backgroundImage: rankGlow(offer.tier, 28) }}>
          <DecalArt tier={offer.tier} sizes="160px" className="absolute inset-[6%]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[1.0625rem] font-semibold leading-tight">
            {justOrdered ? "Decal ordered" : `${label} decal`}
          </span>
          <span className="mt-1 block truncate text-[0.8125rem] text-white/55">
            {justOrdered ? "You'll get an email when it ships" : `For ${offer.carName}`}
          </span>
        </span>
        {!justOrdered && (
          <span className="numeral flex-shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[0.875rem] font-bold text-black">
            {formatUsd(priceCents)}
          </span>
        )}
      </button>
      <DecalSheet offer={offer} priceCents={priceCents} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** A small "Get decal" pill on the car's photo, so the owner sees the
 * decal the moment they open the car, not only after scrolling. */
export function DecalHeroButton({ offer, priceCents }: { offer: DecalOffer; priceCents: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pressable flex h-10 items-center gap-1 rounded-full bg-black/40 pl-1 pr-3.5 text-[0.8125rem] font-semibold text-white backdrop-blur-md"
      >
        <span className="relative h-8 w-8">
          <Image src={`/decals/${offer.tier}.png`} alt="" fill sizes="64px" className="object-contain" />
        </span>
        Get decal
      </button>
      <DecalSheet offer={offer} priceCents={priceCents} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** For someone with no car that can order a decal yet: what decals are
 * and how to get one, leading to their garage. */
export function DecalTeaser() {
  return (
    <Link
      href="/garage"
      className="pressable flex items-center gap-4 rounded-[22px] bg-[#0c0c0f] p-3 pr-4 text-white ring-1 ring-white/[0.06]"
    >
      <span className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-[16px] bg-white/[0.03]" style={{ backgroundImage: rankGlow("diamond", 28) }}>
        <DecalArt tier="diamond" sizes="160px" className="absolute inset-[6%]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.0625rem] font-semibold leading-tight">Rank decals</span>
        <span className="mt-1 block text-[0.8125rem] leading-snug text-white/55">
          Get your car rated and approved to unlock yours
        </span>
      </span>
      <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white/40" />
    </Link>
  );
}
