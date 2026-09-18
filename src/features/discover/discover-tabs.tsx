"use client";

import { useState } from "react";
import { MeetupsList, type MeetupListItem } from "@/features/meetups/meetups-list";
import { ShopsBrowser } from "@/features/shops/shops-browser";
import { SoundBrowser } from "@/features/sounds/sound-browser";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { Crew } from "@/lib/db/crews";
import type { Sound } from "@/lib/db/sounds";

type DiscoverTab = "meets" | "shops" | "sounds";

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
  sounds,
}: {
  meetupItems: MeetupListItem[];
  currentUserId: string | null;
  crews: Crew[];
  sounds: Sound[];
}) {
  const [tab, setTab] = useState<DiscoverTab>("meets");

  return (
    <div>
      <div className="mx-auto w-full max-w-2xl px-4 pt-8 sm:px-6 sm:pt-12">
        <h1 className="mb-4 text-[2.125rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">
          Discover
        </h1>
        <SegmentedControl
          options={[
            { value: "meets", label: "Meets" },
            { value: "shops", label: "Shops" },
            { value: "sounds", label: "Sounds" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "meets" && (
        <MeetupsList items={meetupItems} currentUserId={currentUserId} crews={crews} />
      )}
      {tab === "shops" && <ShopsBrowser />}
      {tab === "sounds" && (
        <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
          <SoundBrowser initialSounds={sounds} />
        </div>
      )}
    </div>
  );
}
