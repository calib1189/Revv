import Link from "next/link";
import { BattleCard } from "@/features/battles/battle-card";
import { BATTLE_POINTS } from "@/lib/points/values";
import { SKIP_LINE } from "@/lib/battles/skip-line";
import type { BattleView } from "@/lib/battles/load";

/** The battle page: the battle up top, the rules in one short block,
 * and (on today's page) yesterday's result underneath. */
export function BattlePageBody({
  view,
  previous,
  isAuthenticated,
  viewerUsername,
}: {
  view: BattleView | null;
  previous: BattleView | null;
  isAuthenticated: boolean;
  viewerUsername: string | null;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <div>
        <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Build Battle</h1>
        <p className="mt-1 text-[0.9375rem] text-muted">Two real builds, one vote. A new battle every day.</p>
      </div>

      {view ? (
        <BattleCard view={view} isAuthenticated={isAuthenticated} viewerUsername={viewerUsername} className="h-[72dvh] max-h-[760px]" />
      ) : (
        <div className="glass-raised elev-1 rounded-[22px] p-5">
          <p className="text-[0.9375rem] font-semibold">No battle yet today</p>
          <p className="mt-1 text-[0.875rem] text-muted">
            Today&apos;s matchup goes up within the hour. Get your car scored and approved to be in one.
          </p>
          <Link href="/score" className="mt-3 inline-block text-[0.875rem] font-semibold text-accent">
            Get your car scored
          </Link>
        </div>
      )}

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
          Want your car in sooner? Skip the line from your car&apos;s page for {SKIP_LINE.price} points. Your car leads the next
          battle against the closest score, and if it doesn&apos;t get one within {SKIP_LINE.expiresDays} days, the points
          come back.
        </p>
      </section>

      {previous && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[1.125rem] font-bold">Yesterday&apos;s battle</h2>
          <BattleCard view={previous} isAuthenticated={isAuthenticated} viewerUsername={viewerUsername} className="h-[56dvh] max-h-[560px]" />
        </section>
      )}
    </div>
  );
}
