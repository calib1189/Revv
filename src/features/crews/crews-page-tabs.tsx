"use client";

import { useMemo, useState } from "react";
import { CrewDiscoverGrid, type CrewCardData } from "@/features/crews/crew-discover-grid";
import { CrewLeaderboardRow } from "@/features/crews/crew-leaderboard-row";
import { GemIcon, FlagIcon } from "@/components/ui/icons";

type View = "discover" | "leaderboard";

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
        active ? "bg-accent text-accent-foreground" : "glass text-muted hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/** Discover (the existing category-filterable grid) vs Leaderboard (every
 * public crew with at least one rated build, ranked by its single
 * best-rated member build — the same bestScore already computed for the
 * discover grid's glow effect, just sorted and shown as ranked rows
 * instead of a border). No new data fetch: both views share the one
 * publicCardData array the page already fetches.
 *
 * The page only renders this once `crews.length > 0` (it has its own
 * "no crews yet" empty state for the zero case), so Discover here never
 * needs its own empty branch — only Leaderboard can legitimately be
 * empty (crews exist, none are rated yet). */
export function CrewsPageTabs({ crews }: { crews: CrewCardData[] }) {
  const [view, setView] = useState<View>("discover");

  const ranked = useMemo(
    () =>
      crews
        .filter((c) => c.bestScore != null)
        .sort((a, b) => (b.bestScore ?? 0) - (a.bestScore ?? 0)),
    [crews],
  );

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <TabButton
          active={view === "discover"}
          onClick={() => setView("discover")}
          icon={<FlagIcon className="h-4 w-4" />}
        >
          Discover
        </TabButton>
        <TabButton
          active={view === "leaderboard"}
          onClick={() => setView("leaderboard")}
          icon={<GemIcon className="h-4 w-4" />}
        >
          Leaderboard
        </TabButton>
      </div>

      {view === "discover" ? (
        <CrewDiscoverGrid crews={crews} />
      ) : ranked.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-4 rounded-2xl py-24 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
            <GemIcon className="h-7 w-7" />
          </span>
          <div>
            <p className="text-lg font-medium">No ranked crews yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
              Once a crew&apos;s member rates and verifies a build, the crew shows up here.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {ranked.map((data, i) => (
            <CrewLeaderboardRow key={data.crew.id} rank={i + 1} data={data} />
          ))}
        </div>
      )}
    </div>
  );
}
