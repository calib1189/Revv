import { RANK_TIERS, RANK_LABELS, rankRangeLabel, tierColorVar } from "@/lib/rating/rank";
import { TierSwatch } from "@/features/garage/tier-swatch";

/** All ten tiers, Cosmic at the top, as one grouped list: badge, name
 * in its tier colour, and the score range on the right. */
export function TierLadder() {
  return (
    <div className="glass-raised elev-1 overflow-hidden rounded-[22px]">
      {RANK_TIERS.map(({ tier }, i) => (
        <div key={tier} className="relative flex items-center gap-3.5 px-4 py-2.5">
          {i > 0 && <span className="absolute left-[4.5rem] right-0 top-0 h-px bg-border" />}
          <TierSwatch tier={tier} className="h-11 w-11 flex-shrink-0" />
          <p className="min-w-0 flex-1 text-[0.9375rem] font-semibold" style={{ color: tierColorVar(tier) }}>
            {RANK_LABELS[tier]}
          </p>
          <p className="numeral flex-shrink-0 text-[0.875rem] text-muted">{rankRangeLabel(tier)}</p>
        </div>
      ))}
    </div>
  );
}
