"use client";

import { useState } from "react";
import { MeetupsList, type MeetupListItem } from "@/features/meetups/meetups-list";
import { ShopsBrowser } from "@/features/shops/shops-browser";

type DiscoverTab = "meets" | "shops";

/** The Discover tab hosts two unrelated things — car meets and a local
 * shop directory — so this just toggles which one is mounted, rather
 * than either one owning the page. Only one is ever mounted at a time:
 * both trigger a browser geolocation request on mount, and there's no
 * reason to ask twice (or run two location-dependent fetches) for
 * whichever section isn't currently showing. */
export function DiscoverTabs({
  meetupItems,
  currentUserId,
}: {
  meetupItems: MeetupListItem[];
  currentUserId: string | null;
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
        <MeetupsList items={meetupItems} currentUserId={currentUserId} />
      ) : (
        <ShopsBrowser />
      )}
    </div>
  );
}
