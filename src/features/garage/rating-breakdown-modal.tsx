"use client";

import { useState } from "react";
import { RANK_LABELS, rankForScore, tierColorVar } from "@/lib/rating/rank";
import { CloseIcon } from "@/components/ui/icons";
import { ProgressRing } from "@/components/ui/progress-ring";
import { RatingSparkline } from "@/features/garage/rating-sparkline";
import { formatDateOnly } from "@/lib/format/date";
import type { BuildRatingSubscores } from "@/lib/providers/rating-provider";

export interface RatingHistoryPoint {
  score: number;
  ratedAt: string;
}

const SUBSCORE_LABELS: Record<keyof BuildRatingSubscores, string> = {
  appearance: "Appearance",
  performance: "Performance",
  wheelsFitment: "Wheels/Fitment",
  interior: "Interior",
  modifications: "Modifications",
};

const SUBSCORE_KEYS = Object.keys(SUBSCORE_LABELS) as (keyof BuildRatingSubscores)[];

/** A build rated under the old (style/execution/mods/photography) or a
 * future taxonomy would otherwise render `undefined` for whichever keys
 * don't match — this is what makes that case fall back to the "rated
 * before subscores existed" message instead, same as truly missing
 * subscores. */
function hasCompleteSubscores(
  subscores: BuildRatingSubscores | null,
): subscores is BuildRatingSubscores {
  return !!subscores && SUBSCORE_KEYS.every((key) => typeof subscores[key] === "number");
}

/** Wraps whatever badge/score text a page already shows and makes it
 * open a breakdown sheet — the "tap a rank badge to see sub-scores and a
 * percentile" mechanic. `subscores`/`topPercent` are null for a build
 * rated before subscores existed, or with too small a population to
 * mean anything (see computeTopPercent) — the sheet still opens, it just
 * says so instead of showing an empty bar chart or a fabricated number. */
export function RatingBreakdownTrigger({
  score,
  subscores,
  topPercent,
  history = [],
  children,
  className = "min-w-0 text-left",
}: {
  className?: string;
  score: number;
  subscores: BuildRatingSubscores | null;
  topPercent: number | null;
  /** Oldest first. Fewer than 2 points isn't a trend, so the chart only
   * renders once there's an actual second data point to compare against. */
  history?: RatingHistoryPoint[];
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const tier = rankForScore(score);
  const validSubscores = hasCompleteSubscores(subscores) ? subscores : null;

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className}>
        {children}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setIsOpen(false)}
            className="animate-fade-in absolute inset-0 bg-black/55"
          />
          <div className="animate-sheet-up glass-raised relative z-10 w-full max-w-lg rounded-t-[28px] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2.5">
            <div className="mx-auto mb-4 h-[5px] w-9 rounded-full bg-foreground/20" />
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[1.25rem] font-bold tracking-[-0.02em]">Breakdown</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-muted hover:text-foreground"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-6 flex items-center gap-4">
              <ProgressRing value={score / 100} size={72} stroke={7} color={tierColorVar(tier)}>
                <span className="numeral text-[0.9375rem] leading-none">{score.toFixed(1)}</span>
              </ProgressRing>
              <div className="min-w-0">
                <p className="text-[1.125rem] font-bold" style={{ color: tierColorVar(tier) }}>
                  {RANK_LABELS[tier]} · <span className="numeral">{score.toFixed(2)}</span>
                </p>
                {topPercent != null && (
                  <p className="mt-0.5 text-[0.875rem] text-muted">Top {topPercent}% of rated builds on SORZA</p>
                )}
              </div>
            </div>

            {validSubscores ? (
              <div className="glass-inset flex flex-col gap-4 rounded-[20px] p-4">
                {SUBSCORE_KEYS.map((key) => (
                  <div key={key}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[0.875rem] font-medium">{SUBSCORE_LABELS[key]}</span>
                      <span className="numeral text-[0.875rem]">{validSubscores[key].toFixed(0)}</span>
                    </div>
                    <div className="h-[6px] w-full overflow-hidden rounded-full bg-foreground/10">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${validSubscores[key]}%`, background: tierColorVar(tier) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[0.9375rem] text-muted">
                This build was rated before subscores existed. Re-rate it to see a full breakdown.
              </p>
            )}

            {history.length >= 2 && (
              <div className="mt-6 border-t border-border pt-5">
                <p className="mb-2 text-[0.8125rem] font-semibold">Rating history</p>
                <RatingSparkline scores={history.map((h) => h.score)} />
                <p className="mt-2 text-xs text-muted">
                  {history.length} ratings since {formatDateOnly(history[0].ratedAt)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
