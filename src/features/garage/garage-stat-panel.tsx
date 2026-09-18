import Link from "next/link";
import { ProgressRing } from "@/components/ui/progress-ring";
import { ChevronRightIcon } from "@/components/ui/icons";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { rankForScore, RANK_LABELS, tierColorVar } from "@/lib/rating/rank";
import { formatCents } from "@/lib/format/money";
import { formatCompactNumber } from "@/lib/format/compact-number";

export interface GarageStats {
  vehicleCount: number;
  /** Every build_part across every active build in this garage — the
   * mods actually logged as data, which is the number this app is
   * really about. */
  modCount: number;
  /** price_cents + install_cost_cents summed across those same parts.
   * Computed here at read time, never stored (CLAUDE.md invariant 3). */
  investedCents: number;
  bestScore: number | null;
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p className="numeral truncate text-[1.375rem] leading-none">{value}</p>
      <p className="mt-1.5 text-[0.6875rem] font-medium text-muted">{label}</p>
    </div>
  );
}

/** The garage's summary card — the best build's score drawn as a ring
 * (score out of 100, in its tier colour), with the garage's totals
 * underneath. Every figure is read back from build_parts at request
 * time; nothing here is stored. */
export function GarageStatPanel({ stats }: { stats: GarageStats }) {
  const tier = stats.bestScore != null ? rankForScore(stats.bestScore) : null;
  const TierIcon = tier ? RANK_MATERIAL_ICONS[tier] : null;
  const ringColor = tier ? tierColorVar(tier) : "var(--muted)";

  return (
    <div className="glass-raised elev-2 overflow-hidden rounded-[28px]">
      <div className="flex items-center gap-5 p-5 sm:p-6">
        <ProgressRing
          value={stats.bestScore != null ? stats.bestScore / 100 : 0}
          size={116}
          stroke={11}
          color={ringColor}
          label={
            stats.bestScore != null
              ? `Best build ${stats.bestScore.toFixed(2)} out of 100`
              : "No build rated yet"
          }
        >
          <div className="text-center">
            <p className="numeral text-[1.5rem] leading-none">
              {stats.bestScore != null ? stats.bestScore.toFixed(2) : "--"}
            </p>
            <p className="mt-1 text-[0.625rem] font-medium text-muted">of 100</p>
          </div>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] font-medium text-muted">Best build</p>
          {tier && TierIcon ? (
            <>
              <div className="mt-1 flex items-center gap-2">
                <TierIcon className="h-6 w-6 flex-shrink-0" />
                <p
                  className="truncate text-[1.375rem] font-bold tracking-[-0.02em]"
                  style={{ color: tierColorVar(tier) }}
                >
                  {RANK_LABELS[tier]}
                </p>
              </div>
              <Link
                href="/leaderboard"
                className="mt-2 inline-flex items-center gap-0.5 text-[0.8125rem] font-medium text-accent transition-opacity hover:opacity-80"
              >
                Leaderboard
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <>
              <p className="mt-1 text-[1.375rem] font-bold tracking-[-0.02em]">Not rated</p>
              <p className="mt-1 text-[0.8125rem] leading-snug text-muted">
                Open a car and rate its build to see where it ranks.
              </p>
            </>
          )}
        </div>
      </div>

      {/* border-border, not a white alpha: this card renders on a
          near-white surface in light theme, where a white hairline is
          invisible. */}
      <div className="mx-5 flex items-stretch border-t border-border py-4 sm:mx-6">
        <Readout label="Vehicles" value={String(stats.vehicleCount)} />
        <div className="w-px flex-shrink-0 bg-border" />
        <Readout label="Mods" value={formatCompactNumber(stats.modCount)} />
        <div className="w-px flex-shrink-0 bg-border" />
        <Readout
          label="Invested"
          value={stats.investedCents > 0 ? formatCents(stats.investedCents) : "--"}
        />
      </div>
    </div>
  );
}
