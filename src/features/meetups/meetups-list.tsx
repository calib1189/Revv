"use client";

import { useEffect, useMemo, useState } from "react";
import { MeetupCard } from "@/features/meetups/meetup-card";
import { CreateMeetupForm } from "@/features/meetups/create-meetup-form";
import { haversineMiles } from "@/lib/geo/distance";
import type { Meetup } from "@/lib/db/meetups";

export interface MeetupListItem {
  meetup: Meetup;
  hostUsername: string;
  photoUrl: string | null;
  photoCount: number;
}

export function MeetupsList({
  items,
  currentUserId,
}: {
  items: MeetupListItem[];
  currentUserId: string | null;
}) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

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
      // Promoted meets always sort ahead of standard ones, regardless of
      // distance — the paid-for visibility bump. Only once both are the
      // same tier does distance (or, with no location, list order) break
      // the tie.
      const promotedA = a.meetup.tier === "promoted" ? 0 : 1;
      const promotedB = b.meetup.tier === "promoted" ? 0 : 1;
      if (promotedA !== promotedB) return promotedA - promotedB;

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
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Car meets near you</h1>
      </div>
      {locationDenied && (
        <p className="mb-4 text-sm text-muted">
          Turn on location to sort these by distance — showing upcoming meets by date instead.
        </p>
      )}

      {currentUserId && (
        <div className="mb-6">
          <CreateMeetupForm userId={currentUserId} />
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-2 rounded-2xl py-24 text-center">
          <p className="text-lg font-medium">No upcoming meets</p>
          <p className="max-w-xs text-sm text-muted">
            {currentUserId
              ? "Be the first to post one."
              : "Log in to post one, or check back later."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map(({ meetup, hostUsername, photoUrl, photoCount }) => (
            <MeetupCard
              key={meetup.id}
              meetup={meetup}
              hostUsername={hostUsername}
              photoUrl={photoUrl}
              photoCount={photoCount}
              distanceMiles={distanceFor(meetup)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
