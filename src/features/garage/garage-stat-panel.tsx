import Link from "next/link";
import type { ReactNode } from "react";
import { RankFrame } from "@/features/garage/rank-frame";
import { ChevronRightIcon, WrenchIcon, WheelIcon, GemIcon } from "@/components/ui/icons";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { RANK_LABELS, tierColorVar, tierProgress } from "@/lib/rating/rank";
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

/** A small square widget — tinted glyph top-left, figure and label at
 * the bottom — like an iOS home-screen widget. */
function SmallWidget({
  icon,
  tint,
  value,
  label,
  delay,
}: {
  icon: ReactNode;
  tint: string;
  value: string;
  label: string;
  delay: number;
}) {
  return (
    <div
      className="animate-section-rise glass-raised elev-1 flex aspect-square min-w-0 flex-col justify-between rounded-[22px] p-3.5 sm:aspect-auto sm:min-h-[132px] sm:p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full [&>svg]:h-4 [&>svg]:w-4"
        style={{ background: `color-mix(in srgb, ${tint} 18%, transparent)`, color: tint }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="numeral truncate text-[1.375rem] leading-none sm:text-[1.625rem]">{value}</p>
        <p className="mt-1 truncate text-[0.75rem] font-medium text-muted">{label}</p>
      </div>
    </div>
  );
}

/** The garage's widget stack: one large Best Build widget — the score as
 * a ring with a light travelling around it, the tier, and how far it is
 * to the next tier — over a row of three small widgets for mods, spend
 * and cars. Every figure is read back from build_parts at request time;
 * nothing here is stored. */
export function GarageStatPanel({ stats }: { stats: GarageStats }) {
  const progress = stats.bestScore != null ? tierProgress(stats.bestScore) : null;
  const TierIcon = progress ? RANK_MATERIAL_ICONS[progress.tier] : null;

  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/leaderboard"
        className="animate-section-rise pressable glass-raised elev-2 block overflow-hidden rounded-[28px] p-5 sm:p-6"
      >
        <div className="flex items-center gap-5">
          {/* The same animated tier ring the profile photo and car photos
              wear (RankFrame), around the score itself. Unrated gets a
              plain hairline circle. */}
          {(() => {
            const score = (
              <div
                className="flex h-full w-full flex-col items-center justify-center rounded-full bg-surface text-center"
                role="img"
                aria-label={
                  stats.bestScore != null
                    ? `Best build ${stats.bestScore.toFixed(2)} out of 100`
                    : "No build rated yet"
                }
              >
                <p className="numeral text-[1.5rem] leading-none">
                  {stats.bestScore != null ? stats.bestScore.toFixed(2) : "--"}
                </p>
                <p className="mt-1 text-[0.625rem] font-medium text-muted">of 100</p>
              </div>
            );
            return stats.bestScore != null ? (
              <RankFrame score={stats.bestScore} hideBadge className="h-[120px] w-[120px] flex-shrink-0 rounded-full">
                {score}
              </RankFrame>
            ) : (
              <div className="h-[120px] w-[120px] flex-shrink-0 rounded-full p-[3px] ring-1 ring-border">{score}</div>
            );
          })()}

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.8125rem] font-medium text-muted">Best build</p>
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/60" />
            </div>
            {progress && TierIcon ? (
              <>
                <div className="mt-1 flex items-center gap-2">
                  <TierIcon className="h-7 w-7 flex-shrink-0" />
                  <p
                    className="truncate text-[1.5rem] font-bold tracking-[-0.02em]"
                    style={{ color: tierColorVar(progress.tier) }}
                  >
                    {RANK_LABELS[progress.tier]}
                  </p>
                </div>
                {/* Progress through the current tier's band, toward the
                    next one — the reason to open a car and keep building. */}
                <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(4, progress.withinTier * 100)}%`,
                      background: progress.next
                        ? `linear-gradient(90deg, ${tierColorVar(progress.tier)}, ${tierColorVar(progress.next)})`
                        : tierColorVar(progress.tier),
                    }}
                  />
                </div>
                <p className="mt-1.5 text-[0.8125rem] text-muted">
                  {progress.next && progress.pointsToNext != null ? (
                    <>
                      <span className="numeral text-foreground">{progress.pointsToNext.toFixed(2)}</span> to{" "}
                      <span className="font-semibold" style={{ color: tierColorVar(progress.next) }}>
                        {RANK_LABELS[progress.next]}
                      </span>
                    </>
                  ) : (
                    "Top tier reached"
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-[1.5rem] font-bold tracking-[-0.02em]">Not rated</p>
                <p className="mt-1 text-[0.8125rem] leading-snug text-muted">
                  Open a car and rate its build to see where it ranks.
                </p>
              </>
            )}
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-3 gap-3">
        <SmallWidget
          icon={<WrenchIcon />}
          tint="#ff9f0a"
          value={formatCompactNumber(stats.modCount)}
          label={stats.modCount === 1 ? "Mod" : "Mods"}
          delay={60}
        />
        <SmallWidget
          icon={<GemIcon />}
          tint="#30d158"
          // Compact ($18K) in a widget this size — the exact figure
          // lives on each car's budget card.
          value={
            stats.investedCents <= 0
              ? "--"
              : stats.investedCents < 100_000
                ? formatCents(stats.investedCents)
                : `$${formatCompactNumber(Math.round(stats.investedCents / 100))}`
          }
          label="Invested"
          delay={100}
        />
        <SmallWidget
          icon={<WheelIcon />}
          tint="#0a84ff"
          value={String(stats.vehicleCount)}
          label={stats.vehicleCount === 1 ? "Car" : "Cars"}
          delay={140}
        />
      </div>
    </div>
  );
}
