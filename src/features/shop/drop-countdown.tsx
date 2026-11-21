"use client";

import { useEffect, useState } from "react";
import { formatDropCountdown } from "@/lib/merch/drop";

/** Milliseconds left on a drop, ticking every second. Null until mounted:
 * the server and the browser can't agree on "now" to the second, so the
 * time only appears once it's running in the browser. */
export function useDropCountdown(endsAt: string | undefined): { msLeft: number | null; ended: boolean } {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [endsAt]);
  if (!endsAt || now === null) return { msLeft: null, ended: false };
  const msLeft = Date.parse(endsAt) - now;
  return { msLeft, ended: msLeft <= 0 };
}

/** "2d 14h 03m 12s", ticking, in tabular figures so it doesn't jitter.
 * Holds its place with a blank until the clock starts. */
export function DropCountdown({ endsAt, className = "" }: { endsAt: string; className?: string }) {
  const { msLeft } = useDropCountdown(endsAt);
  return (
    <span className={`numeral tabular-nums ${className}`} suppressHydrationWarning>
      {msLeft === null ? " " : formatDropCountdown(msLeft)}
    </span>
  );
}
