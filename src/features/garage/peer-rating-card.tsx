"use client";

import { useState, useTransition } from "react";
import { StarIcon } from "@/components/ui/icons";
import { submitPeerRatingAction } from "@/features/garage/peer-rating-actions";
import { hapticTierUp } from "@/lib/haptics";
import type { PeerRatingSummary } from "@/lib/db/peer-ratings";

const STAR_COLOR = "#f0cd6e";
const STARS = [1, 2, 3, 4, 5] as const;

function StarRow({
  value,
  size,
  onHover,
  onClick,
}: {
  value: number;
  size: "sm" | "lg";
  onHover?: (star: number | null) => void;
  onClick?: (star: number) => void;
}) {
  const interactive = Boolean(onClick);
  const starClass = size === "lg" ? "h-9 w-9" : "h-4 w-4";

  return (
    <div className="flex gap-0.5" onMouseLeave={interactive ? () => onHover?.(null) : undefined}>
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onMouseEnter={interactive ? () => onHover?.(n) : undefined}
          onClick={interactive ? () => onClick?.(n) : undefined}
          className={`${interactive ? "cursor-pointer transition-transform duration-150 ease-[var(--ease-ios)] hover:scale-110 active:scale-90" : "cursor-default"}`}
        >
          <StarIcon
            className={`${starClass} transition-colors duration-150`}
            style={{ color: n <= value ? STAR_COLOR : "rgba(255,255,255,0.14)" }}
          />
        </button>
      ))}
    </div>
  );
}

/** A community star rating — deliberately a different shape entirely
 * from the AI's SORZA Rating (1-5 stars in gold, not a 0-100 score in a
 * tier color), so the two are never visually confused. No AI involved,
 * no owner confirmation needed — a third party's direct opinion, the
 * same reasoning likes/comments don't need approval either. The
 * aggregate is computed at read time (see getPeerRatingSummary), never
 * stored. */
export function PeerRatingCard({
  vehicleId,
  summary,
  myInitialRating,
  canRate,
}: {
  vehicleId: string;
  summary: PeerRatingSummary;
  /** Null if this viewer hasn't rated yet, or isn't eligible to
   * (they're the owner, or logged out). */
  myInitialRating: number | null;
  /** False for the owner (can't rate your own build) and for a
   * logged-out visitor — the card still renders for them, read-only. */
  canRate: boolean;
}) {
  const [myRating, setMyRating] = useState(myInitialRating);
  const [hovered, setHovered] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRate(stars: number) {
    const previous = myRating;
    setMyRating(stars);
    setError(null);
    startTransition(async () => {
      const result = await submitPeerRatingAction(vehicleId, stars);
      if (result.error) {
        setMyRating(previous);
        setError(result.error);
      } else {
        hapticTierUp();
      }
    });
  }

  const displayedValue = hovered ?? myRating ?? 0;

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Community Rating</p>
          {summary.count > 0 ? (
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums" style={{ color: STAR_COLOR }}>
                {summary.average!.toFixed(1)}
              </span>
              <span className="text-sm text-muted">
                ({summary.count} {summary.count === 1 ? "rating" : "ratings"})
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">No ratings yet</p>
          )}
        </div>
        <StarRow value={Math.round(summary.average ?? 0)} size="sm" />
      </div>

      {canRate && (
        <div className="mt-4 flex flex-col items-center gap-2 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {myRating ? "Your rating" : "Rate this build"}
          </p>
          <StarRow value={displayedValue} size="lg" onHover={setHovered} onClick={handleRate} />
          {error && <p className="text-xs text-danger">{error}</p>}
          {isPending && <p className="text-xs text-muted">Saving…</p>}
        </div>
      )}
    </div>
  );
}
