"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FeedDrop } from "@/lib/merch/feed-drop";
import { formatUsd } from "@/lib/points/packs";
import { DropCountdown } from "@/features/shop/drop-countdown";
import { PRODUCT_STAGE } from "@/features/shop/product-art";
import { teePhotos3d } from "@/lib/merch/products";
import { HEADER_HEIGHT } from "@/components/shell/tab-pager-shell";

const CYCLE_MS = 2800;

type Seen = { day?: string; dismissed?: boolean };

function storageKey(dropId: string): string {
  return `sorza:feed-drop:${dropId}`;
}

function localDay(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readSeen(dropId: string): Seen {
  try {
    return JSON.parse(localStorage.getItem(storageKey(dropId)) ?? "{}") as Seen;
  } catch {
    return {};
  }
}

function writeSeen(dropId: string, seen: Seen): void {
  try {
    localStorage.setItem(storageKey(dropId), JSON.stringify(seen));
  } catch {
    // Private mode or blocked storage: it may show again, nothing worse.
  }
}

/**
 * The limited tee drop, as one slide deep in the feed (swipe-feed.tsx),
 * never at the top. Kept from being a nag on this device: once a day at
 * most (counted when it's actually seen, so scrolling back to it in the
 * same visit still finds it), gone for the rest of the drop after "Not for
 * me", and never shown to someone who's already bought it (the server
 * leaves it out). Labelled as SORZA's own, not dressed up as a post.
 */
export function DropSlide({ drop, slideHeight }: { drop: FeedDrop; slideHeight: string }) {
  // Decided after mounting (storage is the browser's), so the server and
  // the first render agree; it sits well below the fold, so appearing a
  // moment late is never seen.
  const [allowed, setAllowed] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);
  const [picked, setPicked] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const seen = readSeen(drop.id);
    // A storage read in an effect, so the server and first render agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!seen.dismissed && seen.day !== localDay()) setAllowed(true);
  }, [drop.id]);

  // Counted as seen once it's mostly on screen; and only cycles the
  // colours while it's there.
  useEffect(() => {
    const el = ref.current;
    if (!allowed || !el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const on = entry.isIntersecting && entry.intersectionRatio > 0.6;
        setVisible(on);
        if (on && !counted.current) {
          counted.current = true;
          writeSeen(drop.id, { ...readSeen(drop.id), day: localDay() });
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [allowed, drop.id]);

  useEffect(() => {
    if (!visible || picked || drop.colors.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setColorIndex((i) => (i + 1) % drop.colors.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [visible, picked, drop.colors.length]);

  if (!allowed) return null;

  function dismiss() {
    writeSeen(drop.id, { ...readSeen(drop.id), dismissed: true });
    setAllowed(false);
  }

  return (
    <div
      ref={ref}
      className={`relative flex ${slideHeight} w-full flex-shrink-0 snap-start flex-col overflow-hidden bg-[#141417]`}
      // Clear of the floating tabs and filter chips (swipe-feed.tsx), so
      // the shirt is never tucked under them.
      style={{ paddingTop: `calc(${HEADER_HEIGHT} + 3.25rem)` }}
    >
      <span className={`pointer-events-none absolute inset-0 ${PRODUCT_STAGE}`} />

      {/* The shirt, back first, cross-fading through its colours, in
          whatever height the copy below leaves. */}
      <div className="relative mx-8 min-h-0 flex-1">
        {drop.colors.map((c, i) => (
          // Plain img, like the shop's TeeStill: these are transparent
          // cut-outs, and the image optimizer would flatten them to JPEG.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={c.id}
            src={teePhotos3d(drop.id, c.id).back}
            alt={i === colorIndex ? `${drop.name} Tee in ${c.label.toLowerCase()}, back` : ""}
            loading="lazy"
            draggable={false}
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ease-out ${i === colorIndex ? "opacity-100" : "opacity-0"}`}
          />
        ))}
      </div>

      <div className="relative flex flex-shrink-0 flex-col gap-3 px-5 pb-6 pt-4">
        <p className="micro-label text-accent">Limited drop · From SORZA</p>
        <div>
          <h2 className="text-balance text-[2rem] font-bold leading-[1.05] tracking-[-0.025em] text-white">{drop.name} Tee</h2>
          <p className="mt-1.5 text-[0.9375rem] text-white/75">
            Ends in <DropCountdown endsAt={drop.endsAt} className="font-semibold text-white" /> · from{" "}
            {formatUsd(drop.fromCents)} · Free US shipping
          </p>
        </div>

        <div className="flex gap-2" role="radiogroup" aria-label="Colour">
          {drop.colors.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={i === colorIndex}
              onClick={() => {
                setPicked(true);
                setColorIndex(i);
              }}
              className={`pressable flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors ${
                i === colorIndex ? "bg-white text-black" : "bg-white/10 text-white/80"
              }`}
            >
              <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/20" style={{ background: c.swatch }} />
              {c.label}
            </button>
          ))}
        </div>

        <div className="mt-1 flex items-center gap-3">
          <Link
            href={`/store?tee=${drop.id}`}
            className="pressable flex h-12 flex-1 items-center justify-center rounded-full bg-accent text-[1rem] font-semibold text-white"
          >
            Shop the drop
          </Link>
          <button type="button" onClick={dismiss} className="pressable h-12 px-3 text-[0.875rem] font-medium text-white/60">
            Not for me
          </button>
        </div>
      </div>
    </div>
  );
}
