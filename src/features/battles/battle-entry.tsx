import Link from "next/link";
import { MediaImg } from "@/components/ui/media-img";
import { ChevronRightIcon } from "@/components/ui/icons";
import { Countdown } from "@/features/daily/countdown";
import type { BattleView } from "@/lib/battles/load";

/** What the viewer has (or hasn't) done in today's battle. */
function battleLine(view: BattleView): string {
  if (view.isOwner) return "Your car is in this one";
  if (view.myVote) {
    const pick = view.myVote === view.a.vehicleId ? view.a : view.b;
    return `You picked the ${pick.title}`;
  }
  return "Tap the better build";
}

function needsVote(view: BattleView): boolean {
  return !view.isOwner && !view.myVote;
}

/** Today's Build Battle as a card on the Garage tab, under the Daily's:
 * the way back to it once it has left your feed (after you vote). */
export function BattleEntryCard({ view }: { view: BattleView }) {
  return (
    <Link
      href={`/battle/${view.id}`}
      className="pressable group block overflow-hidden rounded-[24px] bg-neutral-950 elev-2"
    >
      <div className="relative flex aspect-[21/9] w-full gap-[3px]">
        {[view.a, view.b].map((car) => (
          <span key={car.vehicleId} className="relative h-full flex-1 overflow-hidden">
            <MediaImg src={car.heroUrl} sizes="50vw" className="h-full w-full object-cover" loading="lazy" />
          </span>
        ))}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        <span className="pointer-events-none absolute left-1/2 top-[38%] flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black text-[0.6875rem] font-black tracking-wide text-white">
          VS
        </span>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="micro-label text-accent">Build Battle</p>
            <p className="mt-0.5 line-clamp-1 text-[1.125rem] font-bold leading-tight text-white">
              {view.a.title} vs {view.b.title}
            </p>
            <p className="mt-0.5 truncate text-[0.75rem] text-white/70">
              {battleLine(view)} · Results in <Countdown endsAt={view.endsAt} fallback="under 24h" />
            </p>
          </div>
          <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[0.75rem] font-semibold text-white backdrop-blur-md">
            {needsVote(view) ? "Vote" : "View"}
            <ChevronRightIcon className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/** A one-line way into today's Build Battle (under the Leaderboard
 * title, beside the Daily's). */
export function BattleInlineLink({ view }: { view: BattleView }) {
  return (
    <Link href={`/battle/${view.id}`} className="pressable glass-raised elev-1 min-w-0 rounded-[16px] px-3 py-2.5">
      <span className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${needsVote(view) ? "bg-accent" : "bg-foreground/30"}`} />
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">Build Battle</span>
        <span className="numeral flex-shrink-0 text-[0.6875rem] text-muted">
          <Countdown endsAt={view.endsAt} fallback="Today" />
        </span>
      </span>
      <span className="mt-0.5 block truncate text-[0.75rem] text-muted">
        {view.a.title} vs {view.b.title}
      </span>
    </Link>
  );
}
