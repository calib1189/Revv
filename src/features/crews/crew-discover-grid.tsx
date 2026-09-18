"use client";

import { useState } from "react";
import { CrewCard } from "@/features/crews/crew-card";
import { CREW_CATEGORIES, CREW_CATEGORY_LABELS, type CrewCategory } from "@/lib/crews/category";
import { EmptyState } from "@/components/ui/empty-state";
import type { Crew } from "@/lib/db/crews";

export interface CrewCardData {
  crew: Crew;
  logoUrl: string | null;
  bannerUrl: string | null;
  memberCount: number;
  bestScore: number | null;
}

/** Filters a pre-fetched crew list by category entirely client-side —
 * no refetch, same "local state over server-fetched data" idea as
 * ProfileTabs and CrewTabs. Crew counts don't call for a server round
 * trip per filter click. */
export function CrewDiscoverGrid({
  crews,
  showFilter = true,
}: {
  crews: CrewCardData[];
  showFilter?: boolean;
}) {
  const [category, setCategory] = useState<CrewCategory | null>(null);
  const filtered = category ? crews.filter((c) => c.crew.category === category) : crews;

  return (
    <div>
      {showFilter && crews.length > 0 && (
        <div className="no-scrollbar fade-edge-r -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {[null, ...CREW_CATEGORIES].map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat ?? "all"}
                type="button"
                onClick={() => setCategory(cat)}
                className={`pressable flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors ${
                  active ? "bg-foreground text-background" : "text-foreground/80"
                }`}
                style={active ? undefined : { background: "var(--segment-track)" }}
              >
                {cat ? CREW_CATEGORY_LABELS[cat] : "All"}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="Nothing here yet" body="No crews in this category yet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map(({ crew, logoUrl, bannerUrl, memberCount, bestScore }) => (
            <CrewCard
              key={crew.id}
              crew={crew}
              logoUrl={logoUrl}
              bannerUrl={bannerUrl}
              memberCount={memberCount}
              bestScore={bestScore}
            />
          ))}
        </div>
      )}
    </div>
  );
}
