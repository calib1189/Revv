"use client";

import { useState } from "react";
import { RANK_LABELS, RANK_TEXT_COLORS, rankForScore } from "@/lib/rating/rank";
import { CloseIcon } from "@/components/ui/icons";
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
}: {
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
      <button type="button" onClick={() => setIsOpen(true)} className="min-w-0 text-left">
        {children}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="glass-raised relative z-10 w-full max-w-lg rounded-t-[2rem] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Rating breakdown</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-foreground"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-6 text-sm font-medium" style={{ color: RANK_TEXT_COLORS[tier] }}>
              {RANK_LABELS[tier]} · {score.toFixed(2)}
              {topPercent != null && (
                <span className="text-muted"> · Top {topPercent}% of rated builds on REVV</span>
              )}
            </p>

            {validSubscores ? (
              <div className="flex flex-col gap-4">
                {SUBSCORE_KEYS.map((key) => (
                  <div key={key}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{SUBSCORE_LABELS[key]}</span>
                      <span className="tabular-nums text-muted">{validSubscores[key].toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${validSubscores[key]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                This build was rated before subscores existed — re-rate to see a full breakdown.
              </p>
            )}

            {history.length >= 2 && (
              <div className="mt-6 border-t border-border pt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  Rating history
                </p>
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
