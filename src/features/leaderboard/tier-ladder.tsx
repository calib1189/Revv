import { RANK_TIERS, RANK_LABELS, rankRangeLabel } from "@/lib/rating/rank";
import { TierSwatch } from "@/features/garage/tier-swatch";

/** All ten tiers, cosmic at the top, sized so the ladder itself reads as
 * "climbing" — each rung a little smaller than the one above it. */
export function TierLadder() {
  return (
    <div className="relative">
      <div className="absolute bottom-2 left-8 top-2 w-px bg-border" />
      <div className="relative z-10 flex flex-col gap-3">
        {RANK_TIERS.map(({ tier }, i) => (
          <div key={tier} className="flex items-center gap-4">
            <div className="flex w-16 flex-shrink-0 items-center justify-center">
              <TierSwatch tier={tier} className={i === 0 ? "h-14 w-14" : "h-11 w-11"} />
            </div>
            <div className="min-w-0">
              <p className={`font-semibold ${i === 0 ? "text-base" : "text-sm"}`}>
                {RANK_LABELS[tier]}
              </p>
              <p className="text-xs text-muted">{rankRangeLabel(tier)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
