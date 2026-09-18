"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MeetupCard } from "@/features/meetups/meetup-card";
import { CreateMeetupForm } from "@/features/meetups/create-meetup-form";
import { MyMeetupsPanel } from "@/features/meetups/my-meetups-panel";
import { CompassIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { haversineMiles } from "@/lib/geo/distance";
import { MEETUP_TIER_RANK, type Meetup } from "@/lib/db/meetups";
import type { Crew } from "@/lib/db/crews";

export interface MeetupListItem {
  meetup: Meetup;
  hostUsername: string;
  photoUrl: string | null;
  photoCount: number;
}

export function MeetupsList({
  items,
  currentUserId,
  crews,
}: {
  items: MeetupListItem[];
  currentUserId: string | null;
  crews: Crew[];
}) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [isMyMeetupsPanelOpen, setIsMyMeetupsPanelOpen] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      // Deferred to a microtask rather than called directly in the effect
      // body — same value either way, but avoids a synchronous setState
      // during the render-commit phase. Starting `locationDenied` at
      // `false` unconditionally (rather than checking `typeof navigator`
      // in a lazy initializer) also keeps the very first render identical
      // between server and client, since the server has no `navigator` at
      // all — checking it there previously caused a hydration mismatch.
      Promise.resolve().then(() => setLocationDenied(true));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => setLocationDenied(true),
      { timeout: 8000 },
    );
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      // Diamond, then Gold, then Silver, always sort ahead of a lower (or
      // no) tier, regardless of distance — the paid-for visibility bump.
      // Only once both are the same tier does distance (or, with no
      // location, list order) break the tie.
      const rankA = MEETUP_TIER_RANK[a.meetup.tier];
      const rankB = MEETUP_TIER_RANK[b.meetup.tier];
      if (rankA !== rankB) return rankB - rankA;

      if (!userLocation) return 0;
      const distA =
        a.meetup.lat != null && a.meetup.lng != null
          ? haversineMiles(userLocation, { lat: a.meetup.lat, lng: a.meetup.lng })
          : Infinity;
      const distB =
        b.meetup.lat != null && b.meetup.lng != null
          ? haversineMiles(userLocation, { lat: b.meetup.lat, lng: b.meetup.lng })
          : Infinity;
      return distA - distB;
    });
  }, [items, userLocation]);

  function distanceFor(meetup: Meetup): number | null {
    if (!userLocation || meetup.lat == null || meetup.lng == null) return null;
    return haversineMiles(userLocation, { lat: meetup.lat, lng: meetup.lng });
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-7 sm:px-6">
      <div className="mb-4 flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="text-[1.375rem] font-bold tracking-[-0.02em]">Meets near you</h2>
          <p className="mt-0.5 text-[0.875rem] text-muted">Cars &amp; coffee, cruises, track days.</p>
        </div>
        {currentUserId && (
          <button
            type="button"
            onClick={() => setIsMyMeetupsPanelOpen(true)}
            className="pressable flex-shrink-0 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold text-accent"
            style={{ background: "var(--segment-track)" }}
          >
            My meets
          </button>
        )}
      </div>

      {isMyMeetupsPanelOpen && <MyMeetupsPanel onClose={() => setIsMyMeetupsPanelOpen(false)} />}

      {locationDenied && (
        <p className="mb-4 px-1 text-[0.8125rem] text-muted">
          Turn on location to sort by distance. Showing upcoming meets by date.
        </p>
      )}

      {currentUserId && (
        <div className="mb-6">
          <CreateMeetupForm userId={currentUserId} crews={crews} />
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          card
          icon={<CompassIcon />}
          title="No upcoming meets yet"
          body={
            currentUserId
              ? "Be the first to post one: a cars & coffee, a cruise, a track day."
              : "Log in to post one, or check back later."
          }
          action={
            !currentUserId ? (
              <Link href="/login">
                <Button className="px-5">Log in</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {sorted.map(({ meetup, hostUsername, photoUrl, photoCount }, index) => (
            <MeetupCard
              key={meetup.id}
              meetup={meetup}
              hostUsername={hostUsername}
              photoUrl={photoUrl}
              photoCount={photoCount}
              distanceMiles={distanceFor(meetup)}
              priority={index === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
