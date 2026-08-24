import { createClient } from "@/lib/supabase/server";
import { listTopRatedBuilds } from "@/lib/db/builds";
import { composeLeaderboard } from "@/lib/leaderboard/compose-leaderboard";
import { LeaderboardRow } from "@/features/leaderboard/leaderboard-row";
import { RatingExplainer } from "@/features/leaderboard/rating-explainer";
import { TierLadder } from "@/features/leaderboard/tier-ladder";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const builds = await listTopRatedBuilds(supabase, 50);
  const entries = await composeLeaderboard(supabase, builds);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Leaderboard</h1>
      <p className="mb-6 text-sm text-muted">
        The highest-rated builds on REVV right now, ranked by AI.
      </p>

      {entries.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-2 rounded-2xl py-24 text-center">
          <p className="text-lg font-medium">No rated builds yet</p>
          <p className="max-w-xs text-sm text-muted">
            Rate your build from your garage to be the first on the board.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, i) => (
            <LeaderboardRow key={entry.buildId} rank={i + 1} entry={entry} />
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-col gap-8">
        <RatingExplainer />

        <div>
          <h2 className="mb-1 text-lg font-semibold">The tiers</h2>
          <p className="mb-5 text-sm text-muted">
            Every tier has its own look on your profile and garage photos — climb from
            Bronze to Cosmic as your build (and its score) grows.
          </p>
          <TierLadder />
        </div>
      </div>
    </div>
  );
}
