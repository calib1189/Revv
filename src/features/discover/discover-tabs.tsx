"use client";

import { useState } from "react";
import { MeetupsList, type MeetupListItem } from "@/features/meetups/meetups-list";
import { ShopsBrowser } from "@/features/shops/shops-browser";
import { PartsBrowser } from "@/features/parts/parts-browser";
import type { Crew } from "@/lib/db/crews";

type DiscoverTab = "meets" | "shops" | "parts";

/** The Discover tab hosts three unrelated things — car meets, a local
 * shop directory, and the parts marketplace — so this just toggles which
 * one is mounted, rather than any one of them owning the page. Only one
 * is ever mounted at a time: Meets/Shops both trigger a browser
 * geolocation request on mount, and there's no reason to ask twice (or
 * run a location-dependent fetch) for whichever section isn't currently
 * showing. Parts was previously only reachable at the standalone /parts
 * route (see tab-order.ts's history) — surfacing it here too is what
 * actually grows Discover into a marketplace, reusing the real,
 * already-built PartsBrowser rather than inventing a second one. */
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
          <button
            type="button"
            onClick={() => setTab("parts")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "parts" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            Parts
          </button>
        </div>
      </div>

      {tab === "meets" && <MeetupsList items={meetupItems} currentUserId={currentUserId} crews={crews} />}
      {tab === "shops" && <ShopsBrowser />}
      {tab === "parts" && (
        <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
          <PartsBrowser />
        </div>
      )}
    </div>
  );
}
