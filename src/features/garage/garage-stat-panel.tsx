import Link from "next/link";
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
    <div className="min-w-0 flex-1 px-1 text-center">
      <p className="numeral truncate text-lg leading-none sm:text-xl">{value}</p>
      <p className="micro-label mt-2 text-muted">{label}</p>
    </div>
  );
}

/** The garage's instrument panel.
 *
 * The garage was a heading, two buttons, and a stack of cards — it
 * showed none of what the person had actually built. Every figure here
 * already existed in the database and went unread on this page: the
 * mods logged against each build, what they cost, the best score across
 * the whole garage. Reading them back as a cluster is what makes this
 * screen feel like somewhere you've made progress rather than a list of
 * photos. */
export function GarageStatPanel({ stats }: { stats: GarageStats }) {
  const tier = stats.bestScore != null ? rankForScore(stats.bestScore) : null;
  const TierIcon = tier ? RANK_MATERIAL_ICONS[tier] : null;

  return (
    <div className="glass-raised elev-2 overflow-hidden rounded-3xl">
      <div className="flex items-center gap-4 p-5">
        <div className="min-w-0 flex-1">
          <p className="micro-label text-muted">Best build</p>
          {stats.bestScore != null && tier ? (
            <>
              <p className="numeral mt-1.5 text-5xl leading-none">
                {stats.bestScore.toFixed(2)}
              </p>
              <Link
                href="/leaderboard"
                className="micro-label mt-2 inline-block transition-opacity hover:opacity-80"
                style={{ color: tierColorVar(tier) }}
              >
                {RANK_LABELS[tier]}
              </Link>
            </>
          ) : (
            <>
              <p className="numeral mt-1.5 text-5xl leading-none text-muted/40">--.--</p>
              <p className="mt-2 text-xs text-muted">Rate a build to get scored</p>
            </>
          )}
        </div>

        {TierIcon && (
          <TierIcon className="h-16 w-16 flex-shrink-0 sm:h-20 sm:w-20" />
        )}
      </div>

      {/* border-border, not a white alpha: this panel renders on a
          near-white surface in light theme, where a 6%-white hairline
          is invisible. */}
      <div className="flex items-stretch border-t border-border py-4">
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
