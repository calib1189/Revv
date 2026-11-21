"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DailyBoost } from "@/lib/daily/boost";
import { isAnnouncementBlockedPath } from "@/lib/announcements";
import { markDailyBoostSeenAction } from "@/features/daily/actions";
import { ChallengeVisual } from "@/features/daily/challenge-visual";
import { Countdown } from "@/features/daily/countdown";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/** A prize day's takeover: the first time someone opens the app on a day
 * whose Daily winner gets more points than usual, and hasn't entered yet.
 * Marked seen as soon as it shows, so it's once per day per account. Never
 * over the Daily itself, where the prize is already front and centre. */
export function DailyBoostPromo({ boost }: { boost: DailyBoost }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current || isAnnouncementBlockedPath(pathname) || pathname.startsWith("/daily")) return;
    // A beat after the app paints, so it reads as an announcement rather
    // than part of the page loading.
    const t = setTimeout(() => {
      shown.current = true;
      setOpen(true);
      void markDailyBoostSeenAction(boost.dateKey);
    }, 900);
    return () => clearTimeout(t);
  }, [pathname, boost.dateKey]);

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="Prize day">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[22px] bg-neutral-950 text-white">
        <ChallengeVisual icon={boost.icon} coverUrl={boost.coverUrl} priority />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20" />
        <span className="absolute left-3 top-3 flex h-7 items-center gap-2 rounded-full bg-black/55 px-3 text-[0.6875rem] font-semibold tracking-[0.12em] backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
            <span className="relative h-2 w-2 rounded-full bg-accent" />
          </span>
          LIVE NOW
        </span>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="micro-label text-accent">Today&apos;s Sorza Daily</p>
          <p className="mt-1 text-balance text-[1.375rem] font-bold leading-tight tracking-[-0.02em]">{boost.title}</p>
          {boost.sponsorName && <p className="mt-0.5 text-[0.8125rem] text-white/70">Presented by {boost.sponsorName}</p>}
        </div>
      </div>

      <div className="mt-5 text-center">
        <p className="numeral text-[4rem] font-bold leading-none tracking-[-0.045em] text-accent">
          {boost.points.toLocaleString("en-US")}
        </p>
        <p className="micro-label mt-1 text-accent">points</p>
        <h3 className="mt-3 text-balance text-[1.375rem] font-bold leading-tight tracking-[-0.025em]">
          to whoever wins today
        </h3>
        <p className="mt-2 text-[0.9375rem] leading-snug text-muted">
          {boost.prize ? `Plus ${boost.prize}. ` : ""}Post your car, get the most votes, take it all. Closes in{" "}
          <Countdown endsAt={boost.endsAt} clock fallback="a few hours" className="font-semibold text-foreground" />.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Link href="/daily" onClick={() => setOpen(false)}>
          <Button className="h-12 w-full text-[1rem] font-semibold">Enter now</Button>
        </Link>
        <Button variant="ghost" onClick={() => setOpen(false)} className="h-11 w-full text-[0.9375rem] text-muted">
          Maybe later
        </Button>
      </div>
    </Sheet>
  );
}
