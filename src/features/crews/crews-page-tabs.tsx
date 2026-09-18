"use client";

import { useMemo, useState } from "react";
import { CrewDiscoverGrid, type CrewCardData } from "@/features/crews/crew-discover-grid";
import { CrewLeaderboardRow } from "@/features/crews/crew-leaderboard-row";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import { GemIcon } from "@/components/ui/icons";

type View = "discover" | "leaderboard";

/** Discover (the category-filterable grid) vs Leaderboard (every public
 * crew with at least one rated build, ranked by its single best-rated
 * member build). No new data fetch: both views share the one
 * publicCardData array the page already fetches.
 *
 * The page only renders this once `crews.length > 0` (it has its own
 * "no crews yet" empty state for the zero case), so only Leaderboard can
 * legitimately be empty here (crews exist, none are rated yet). */
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
      <SegmentedControl
        className="mb-5"
        options={[
          { value: "discover", label: "Discover" },
          { value: "leaderboard", label: "Leaderboard" },
        ]}
        value={view}
        onChange={setView}
      />

      <div key={view} className="animate-tab-content-in">
        {view === "discover" ? (
          <CrewDiscoverGrid crews={crews} />
        ) : ranked.length === 0 ? (
          <EmptyState
            card
            icon={<GemIcon />}
            title="No ranked crews yet"
            body="Once a member rates and verifies a build, their crew shows up here."
          />
        ) : (
          <div className="glass-raised elev-1 overflow-hidden rounded-[22px] [&>*+*]:before:absolute [&>*+*]:before:left-[6.875rem] [&>*+*]:before:right-0 [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:bg-border [&>*+*]:before:content-['']">
            {ranked.map((data, i) => (
              <CrewLeaderboardRow key={data.crew.id} rank={i + 1} data={data} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
