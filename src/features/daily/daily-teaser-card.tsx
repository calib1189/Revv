import Image from "next/image";
import Link from "next/link";
import type { DailyTeaser } from "@/lib/daily/teaser";
import { ChallengeVisual } from "@/features/daily/challenge-visual";
import { Countdown } from "@/features/daily/countdown";
import { ChevronRightIcon } from "@/components/ui/icons";

/** "Presented by X · Win: Y", whichever parts the day has. */
function sponsorLine(teaser: DailyTeaser): string {
  return [teaser.sponsorName && `Presented by ${teaser.sponsorName}`, teaser.prize && `Win: ${teaser.prize}`]
    .filter(Boolean)
    .join(" · ");
}

/** Today's challenge as a card (the Garage tab's entry point). */
export function DailyTeaserCard({ teaser }: { teaser: DailyTeaser }) {
  return (
    <Link href="/daily" className="pressable group block overflow-hidden rounded-[24px] bg-neutral-950 elev-2">
      <div className="relative aspect-[21/9] w-full">
        <ChallengeVisual icon={teaser.icon} coverUrl={teaser.coverUrl ?? teaser.entryPhotos[0] ?? null} />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
        <div className="absolute inset-y-0 left-0 flex max-w-[75%] flex-col justify-center gap-1 p-4">
          <p className="micro-label text-accent">Sorza Daily</p>
          <p className="text-balance text-[1.25rem] font-bold leading-tight text-white">{teaser.title}</p>
          {(teaser.sponsorName || teaser.prize) && (
            <p className="truncate text-[0.75rem] font-semibold text-white/85">{sponsorLine(teaser)}</p>
          )}
          <p className="text-[0.75rem] text-white/70">
            <Countdown endsAt={teaser.endsAt} /> left ·{" "}
            {teaser.entryCount === 1 ? "1 entry" : `${teaser.entryCount} entries`}
          </p>
        </div>
        <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[0.75rem] font-semibold text-white backdrop-blur-md">
          {teaser.tookPartToday ? "View" : "Enter"}
          <ChevronRightIcon className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

/** Today's challenge as a full-height feed slide. Shown at the top of the
 * feed until you've taken part today; the photos are real entries. */
export function DailyFeedSlide({ teaser, slideHeight }: { teaser: DailyTeaser; slideHeight: string }) {
  return (
    <div className={`relative ${slideHeight} w-full flex-shrink-0 snap-start overflow-hidden bg-black`}>
      <ChallengeVisual icon={teaser.icon} coverUrl={teaser.coverUrl ?? teaser.entryPhotos[0] ?? null} priority />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/30" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 px-5 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
        <p className="micro-label text-accent">Today on Sorza Daily</p>
        <h2 className="text-balance text-[2rem] font-bold leading-[1.05] tracking-[-0.02em] text-white">{teaser.title}</h2>
        {(teaser.sponsorName || teaser.prize) && (
          <p className="text-[0.9375rem] font-semibold text-white">{sponsorLine(teaser)}</p>
        )}
        <p className="max-w-md text-[0.9375rem] leading-relaxed text-white/80">{teaser.description}</p>
        {teaser.entryPhotos.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-3">
              {teaser.entryPhotos.map((url) => (
                <span key={url} className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-black">
                  <Image src={url} alt="" fill sizes="72px" className="object-cover" />
                </span>
              ))}
            </div>
            <span className="text-[0.8125rem] text-white/70">
              {teaser.entryCount === 1 ? "1 entry so far" : `${teaser.entryCount} entries so far`}
            </span>
          </div>
        )}
        <div className="mt-1 flex items-center gap-3">
          <Link
            href="/daily"
            className="pressable flex h-12 flex-1 items-center justify-center rounded-full bg-accent text-[0.9375rem] font-semibold text-white"
          >
            {teaser.entryCount > 0 ? "Enter or vote" : "Be the first to enter"}
          </Link>
          <span className="numeral rounded-full bg-white/15 px-4 py-3 text-[0.8125rem] font-semibold text-white backdrop-blur-md">
            <Countdown endsAt={teaser.endsAt} /> left
          </span>
        </div>
      </div>
    </div>
  );
}

/** A one-line way into Sorza Daily (under the Leaderboard title). */
export function DailyInlineLink({ teaser }: { teaser: DailyTeaser }) {
  return (
    <Link
      href="/daily"
      className="pressable glass-raised elev-1 mt-3 flex items-center gap-3 rounded-[16px] px-3.5 py-2.5"
    >
      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${teaser.tookPartToday ? "bg-foreground/30" : "bg-accent"}`} />
      <span className="min-w-0 flex-1 truncate text-[0.875rem]">
        <span className="font-semibold">Sorza Daily</span>
        <span className="text-muted"> · {teaser.title}</span>
      </span>
      <span className="flex-shrink-0 text-[0.75rem] text-muted">
        <Countdown endsAt={teaser.endsAt} /> left
      </span>
      <ChevronRightIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted" />
    </Link>
  );
}
