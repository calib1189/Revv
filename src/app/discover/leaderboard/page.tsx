import { createClient } from "@/lib/supabase/server";
import { listTopRatedBuilds } from "@/lib/db/builds";
import { composeLeaderboard } from "@/lib/leaderboard/compose-leaderboard";
import { DiscoverTabs } from "@/features/discover/discover-tabs";
import { LeaderboardRow } from "@/features/leaderboard/leaderboard-row";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const builds = await listTopRatedBuilds(supabase, 50);
  const entries = await composeLeaderboard(supabase, builds);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <DiscoverTabs active="leaderboard" />

      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Top builds</h1>
      <p className="mb-6 text-sm text-muted">
        Every build is rated 0–10 by AI from its real mods and photos — the higher the
        score, the higher the tier. These are the highest-rated builds on REVV right now.
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
    </div>
  );
}
