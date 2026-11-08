"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { rateRideAction, type RideResult } from "@/features/daily/actions";
import type { RideCar } from "@/lib/daily/ride-server";
import { Avatar } from "@/features/feed/avatar";
import { Button } from "@/components/ui/button";
import { CheckIcon, StarIcon } from "@/components/ui/icons";

const STAR = "#f0cd6e";

const COMPARISON_COPY: Record<NonNullable<RideResult["comparison"]>, string> = {
  higher: "You rated it higher than most.",
  lower: "You were tougher on it than most.",
  same: "Right in line with the community.",
  first: "You're the first to rate it.",
};

/** Today's three cars: rate one, see what everyone else thinks, move on.
 * Ratings are community star ratings; the SORZA AI score is shown
 * alongside, labelled, and never blended in. */
export function RideRound({ cars }: { cars: RideCar[] }) {
  const firstUnrated = cars.findIndex((c) => c.myStars === null);
  const [index, setIndex] = useState(firstUnrated === -1 ? cars.length : firstUnrated);
  const [results, setResults] = useState<Record<string, RideResult>>({});
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState(0);
  const [isPending, startTransition] = useTransition();

  if (cars.length === 0) {
    return (
      <p className="glass-raised elev-1 rounded-[22px] px-5 py-8 text-center text-[0.9375rem] leading-relaxed text-muted">
        You&apos;ve rated every car on SORZA so far. New rides show up as people add their cars.
      </p>
    );
  }

  if (index >= cars.length) {
    return (
      <div className="glass-raised elev-1 flex flex-col items-center gap-3 rounded-[22px] px-5 py-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white">
          <CheckIcon className="h-6 w-6" />
        </span>
        <p className="text-[1.0625rem] font-semibold">That&apos;s today&apos;s rides</p>
        <p className="text-[0.875rem] text-muted">Three new ones are waiting tomorrow.</p>
        <Link href="/daily" className="mt-2 text-[0.9375rem] font-semibold text-accent">
          Back to Sorza Daily
        </Link>
      </div>
    );
  }

  const car = cars[index];
  const result = results[car.vehicleId];

  function rate(stars: number) {
    setError(null);
    startTransition(async () => {
      const res = await rateRideAction(car.vehicleId, stars);
      if (res.error) {
        setError(res.error);
        return;
      }
      setResults((prev) => ({ ...prev, [car.vehicleId]: res }));
      setHovered(0);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-1.5" aria-label={`Car ${index + 1} of ${cars.length}`}>
        {cars.map((c, i) => (
          <span
            key={c.vehicleId}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-accent" : i < index ? "w-1.5 bg-foreground/60" : "w-1.5 bg-foreground/20"}`}
          />
        ))}
      </div>

      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[26px] bg-neutral-950 elev-3">
        {car.photoUrl && <Image src={car.photoUrl} alt="" fill priority sizes="(min-width: 640px) 560px, 100vw" className="object-cover" />}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-4">
          <Avatar username={car.ownerUsername} avatarUrl={car.ownerAvatarUrl} className="h-10 w-10 text-sm" />
          <div className="min-w-0">
            <p className="truncate text-[1.0625rem] font-bold text-white">{car.title}</p>
            <p className="truncate text-[0.8125rem] text-white/70">@{car.ownerUsername}</p>
          </div>
        </div>
      </div>

      {!result ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-[0.875rem] text-muted">How would you rate this ride?</p>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Your rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={false}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                disabled={isPending}
                onClick={() => rate(n)}
                onPointerEnter={() => setHovered(n)}
                onPointerLeave={() => setHovered(0)}
                className="pressable flex h-14 w-14 items-center justify-center rounded-full bg-foreground/[0.06] disabled:opacity-50"
              >
                <StarIcon
                  className="h-8 w-8 transition-colors"
                  style={{ color: n <= hovered ? STAR : "color-mix(in srgb, var(--foreground) 22%, transparent)" }}
                />
              </button>
            ))}
          </div>
          {error && <p className="text-[0.8125rem] text-danger">{error}</p>}
        </div>
      ) : (
        <div className="glass-raised elev-1 flex flex-col gap-4 rounded-[22px] p-5 animate-section-rise">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="micro-label text-muted">You</p>
              <p className="numeral mt-1 flex items-center gap-1 text-[1.5rem] font-bold">
                {result.myStars}
                <StarIcon className="h-5 w-5" style={{ color: STAR }} />
              </p>
            </div>
            <div className="text-right">
              <p className="micro-label text-muted">Community</p>
              <p className="numeral mt-1 text-[1.5rem] font-bold">
                {result.communityAverage !== null && result.communityAverage !== undefined ? result.communityAverage.toFixed(1) : "–"}
              </p>
              <p className="text-[0.75rem] text-muted">
                {result.communityCount === 1 ? "1 rating" : `${result.communityCount} ratings`}
              </p>
            </div>
          </div>
          {result.distribution && result.communityCount ? (
            <ul className="flex flex-col gap-1">
              {([5, 4, 3, 2, 1] as const).map((s) => (
                <li key={s} className="flex items-center gap-2 text-[0.75rem] text-muted">
                  <span className="numeral w-2 text-right">{s}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.08]">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(result.distribution![s] / result.communityCount!) * 100}%`, background: STAR }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {result.comparison && <p className="text-[0.9375rem] font-medium">{COMPARISON_COPY[result.comparison]}</p>}
          {result.aiScore !== null && result.aiScore !== undefined && (
            <p className="text-[0.75rem] text-muted">
              SORZA AI rating <span className="numeral text-foreground">{result.aiScore.toFixed(2)}</span>. That&apos;s the
              AI&apos;s score, separate from community stars.
            </p>
          )}
          <div className="flex gap-2.5">
            <Link
              href={`/garage/${car.vehicleId}`}
              className="flex h-11 flex-1 items-center justify-center rounded-full bg-foreground/[0.08] text-[0.9375rem] font-semibold"
            >
              View garage
            </Link>
            <Button type="button" onClick={() => setIndex(index + 1)} className="h-11 flex-1 text-[0.9375rem] font-semibold">
              {index + 1 < cars.length ? "Next ride" : "Finish"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
