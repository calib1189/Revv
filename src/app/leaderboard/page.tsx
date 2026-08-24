import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listTopRatedBuilds } from "@/lib/db/builds";
import { listVehicleIdsByCategory } from "@/lib/db/vehicles";
import { composeLeaderboard } from "@/lib/leaderboard/compose-leaderboard";
import { LeaderboardRow } from "@/features/leaderboard/leaderboard-row";
import { RatingExplainer } from "@/features/leaderboard/rating-explainer";
import { TierLadder } from "@/features/leaderboard/tier-ladder";
import {
  VEHICLE_CATEGORIES,
  VEHICLE_CATEGORY_LABELS,
  isVehicleCategory,
} from "@/lib/vehicles/category";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: rawCategory } = await searchParams;
  const category = rawCategory && isVehicleCategory(rawCategory) ? rawCategory : null;

  const supabase = await createClient();
  const vehicleIds = category ? await listVehicleIdsByCategory(supabase, category) : undefined;
  const builds = await listTopRatedBuilds(supabase, 50, vehicleIds);
  const entries = await composeLeaderboard(supabase, builds);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Leaderboard</h1>
      <p className="mb-5 text-sm text-muted">
        {category
          ? `The highest-rated ${VEHICLE_CATEGORY_LABELS[category]} builds on REVV, ranked by AI.`
          : "The highest-rated builds on REVV right now, ranked by AI."}
      </p>

      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
        <Link
          href="/leaderboard"
          className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            !category ? "bg-accent text-accent-foreground" : "glass text-muted hover:text-foreground"
          }`}
        >
          All
        </Link>
        {VEHICLE_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/leaderboard?category=${c}`}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              category === c
                ? "bg-accent text-accent-foreground"
                : "glass text-muted hover:text-foreground"
            }`}
          >
            {VEHICLE_CATEGORY_LABELS[c]}
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-2 rounded-2xl py-24 text-center">
          <p className="text-lg font-medium">No rated builds yet</p>
          <p className="max-w-xs text-sm text-muted">
            {category
              ? `Rate a ${VEHICLE_CATEGORY_LABELS[category]} build from your garage to be the first on this board.`
              : "Rate your build from your garage to be the first on the board."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, i) => (
            <LeaderboardRow
              key={entry.buildId}
              rank={i + 1}
              entry={entry}
              showCategory={!category}
            />
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
