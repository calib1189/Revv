"use client";

import { useState } from "react";
import { CrewCard } from "@/features/crews/crew-card";
import { CREW_CATEGORIES, CREW_CATEGORY_LABELS, type CrewCategory } from "@/lib/crews/category";
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
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              category === null ? "bg-accent text-accent-foreground" : "glass text-muted hover:text-foreground"
            }`}
          >
            All
          </button>
          {CREW_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                category === cat ? "bg-accent text-accent-foreground" : "glass text-muted hover:text-foreground"
              }`}
            >
              {CREW_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No crews in this category yet.</p>
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
