import Link from "next/link";
import { BattleArena } from "@/features/battles/battle-arena";
import { BATTLE_POINTS } from "@/lib/points/values";
import { SKIP_LINE } from "@/lib/battles/skip-line";
import type { BattleView } from "@/lib/battles/load";
import { PastBattles } from "@/features/battles/past-battles";

/** The battle page: today's battle as a full-screen versus screen, the
 * rules in one short block under it, and (on today's page) yesterday's
 * result. */
export function BattlePageBody({
  view,
  previous,
  past = [],
  isAuthenticated,
  viewerUsername,
}: {
  view: BattleView | null;
  previous: BattleView | null;
  /** Earlier finished battles, newest first (today's page only). */
  past?: BattleView[];
  isAuthenticated: boolean;
  viewerUsername: string | null;
}) {
  // Everything under the app's header (and above the tab bar, signed in).
  const fullHeight = `max(560px, calc(100dvh - 3.5rem - env(safe-area-inset-top)${isAuthenticated ? " - var(--bottom-nav-h)" : ""}))`;
  return (
    <div className="flex w-full flex-1 flex-col">
      {view ? (
        <div className="mx-auto w-full max-w-xl">
          <BattleArena view={view} isAuthenticated={isAuthenticated} viewerUsername={viewerUsername} height={fullHeight} />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-xl px-4 pt-6 sm:px-6">
          <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Build Battle</h1>
          <div className="glass-raised elev-1 mt-4 rounded-[22px] p-5">
            <p className="text-[0.9375rem] font-semibold">No battle yet today</p>
            <p className="mt-1 text-[0.875rem] text-muted">
              Today&apos;s matchup goes up within the hour. Get your car scored and approved to be in one.
            </p>
            <Link href="/score" className="mt-3 inline-block text-[0.875rem] font-semibold text-accent">
              Get your car scored
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6">
        <section className="glass-raised elev-1 rounded-[22px] p-5 text-[0.875rem] leading-relaxed text-muted">
          <p className="mb-2 text-[0.9375rem] font-semibold text-foreground">How it works</p>
          <p>
            Every day at midnight Central, two approved builds face off. Vote for the better one: +{BATTLE_POINTS.voted}{" "}
            points, and +{BATTLE_POINTS.calledIt} more if you picked the winner. Results show the next day.
          </p>
          <p className="mt-2">
            The winning car&apos;s owner gets +{BATTLE_POINTS.win} points, or +{BATTLE_POINTS.upsetWin} for an upset: when
            the crowd picks the car SORZA scored lower. Scores stay hidden until you vote, so you judge the build, not the
            number.
          </p>
          <p className="mt-2">
            Want your car in sooner? Skip the line from your car&apos;s page for {SKIP_LINE.price} points. Your car leads the
            next battle against the closest score, and if it doesn&apos;t get one within {SKIP_LINE.expiresDays} days, the
            points come back.
          </p>
        </section>

        {previous && (
          <section className="flex flex-col gap-3">
            <h2 className="px-1 text-[1.125rem] font-bold">Yesterday&apos;s battle</h2>
            <div className="-mx-4 overflow-hidden sm:mx-0 sm:rounded-[22px]">
              <BattleArena view={previous} isAuthenticated={isAuthenticated} viewerUsername={viewerUsername} height="560px" />
            </div>
          </section>
        )}

        <PastBattles battles={past} />
      </div>
    </div>
  );
}
