"use client";

import { CameraIcon, ChevronRightIcon } from "@/components/ui/icons";
import { OPEN_PHOTOS_EVENT } from "@/features/garage/vehicle-tabs-events";
import { describeMissingShots, missingShots } from "@/lib/rating/missing-shots";
import { MAX_RATING_PHOTOS } from "@/lib/rating/rated-photos";

/** Under "What's holding it back", for the owner: when the AI said it
 * couldn't see the engine bay or interior, say so plainly and take them
 * to the photos. Read from the AI's own words; nothing is stored. */
export function MissingShotsPrompt({ limitingFactors }: { limitingFactors: string | null }) {
  const shots = missingShots(limitingFactors);
  if (shots.length === 0) return null;
  const what = describeMissingShots(shots);
  const add = shots.length > 1 ? `${shots.join(" and ")} shots` : `a clear ${shots[0]} shot`;

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PHOTOS_EVENT))}
      className="pressable mt-5 flex w-full items-center gap-3 rounded-[18px] border border-border bg-white/[0.03] px-4 py-3.5 text-left"
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent">
        <CameraIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.875rem] font-semibold">The AI couldn&apos;t see your {what}</span>
        <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">
          It rates {MAX_RATING_PHOTOS} photos. Add {add}, mark {shots.length > 1 ? "them" : "it"} Rated, then
          re-rate.
        </span>
      </span>
      <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted" />
    </button>
  );
}
