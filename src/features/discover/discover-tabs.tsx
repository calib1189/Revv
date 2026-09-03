"use client";

import { useState } from "react";
import { MeetupsList, type MeetupListItem } from "@/features/meetups/meetups-list";
import { ShopsBrowser } from "@/features/shops/shops-browser";
import type { Crew } from "@/lib/db/crews";

type DiscoverTab = "meets" | "shops";

/** The Discover tab hosts two unrelated things — car meets and a local
 * shop directory — so this just toggles which one is mounted, rather
 * than either one owning the page. Only one is ever mounted at a time:
 * both trigger a browser geolocation request on mount, and there's no
 * reason to ask twice (or run two location-dependent fetches) for
 * whichever section isn't currently showing.
 *
 * Parts briefly lived here as a third tab, reusing the real
 * PartsBrowser/affiliate-link marketplace at /parts — pulled back out:
 * the parts catalog has zero verified parts today (no seed data, no
 * admin-added inventory), so the tab's entire content was a bare
 * category grid whose only real function was "click here to search
 * Amazon." That doesn't earn equal billing with Meets/Shops, which have
 * real content, and giving Marketplace a permanent nav slot works
 * against the core-loop-first priority (Marketplace is explicitly
 * Priority 3 — "do not overbuild yet"). The route itself is untouched
 * at /parts — this is a one-line change to add back once there's a real
 * catalog to show. */
export function DiscoverTabs({
  meetupItems,
  currentUserId,
  crews,
}: {
  meetupItems: MeetupListItem[];
  currentUserId: string | null;
  crews: Crew[];
}) {
  const [tab, setTab] = useState<DiscoverTab>("meets");

  return (
    <div>
      <div className="mx-auto w-full max-w-2xl px-4 pt-6 sm:px-6">
        <div className="glass inline-flex rounded-full p-1">
          <button
            type="button"
            onClick={() => setTab("meets")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "meets" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            Meets
          </button>
          <button
            type="button"
            onClick={() => setTab("shops")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "shops" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            Shops
          </button>
        </div>
      </div>

      {tab === "meets" ? (
        <MeetupsList items={meetupItems} currentUserId={currentUserId} crews={crews} />
      ) : (
        <ShopsBrowser />
      )}
    </div>
  );
}
