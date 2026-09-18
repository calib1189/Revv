import { ProgressRing } from "@/components/ui/progress-ring";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { rankForScore, RANK_LABELS, tierColorVar } from "@/lib/rating/rank";

/** The build score as the headline of a vehicle page: the score drawn
 * as a ring in its tier colour with the number inside, tier name and
 * icon beside it. Presentational only — callers wrap it in a
 * RatingBreakdownTrigger to make it open the breakdown sheet. Used by
 * both the owner's RateBuildPanel and the visitor view, so the two read
 * as the same object. */
export function ScoreHero({ score, caption = "Tap for breakdown" }: { score: number; caption?: string }) {
  const tier = rankForScore(score);
  const Icon = RANK_MATERIAL_ICONS[tier];

  return (
    <div className="flex items-center gap-5">
      <ProgressRing
        value={score / 100}
        size={112}
        stroke={10}
        color={tierColorVar(tier)}
        label={`Build score ${score.toFixed(2)} out of 100`}
      >
        <div className="text-center">
          <p className="numeral text-[1.5rem] leading-none">{score.toFixed(2)}</p>
          <p className="mt-1 text-[0.625rem] font-medium text-muted">of 100</p>
        </div>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-medium text-muted">Build score</p>
        <div className="mt-1 flex items-center gap-2">
          <Icon className="h-7 w-7 flex-shrink-0" />
          <p
            className="truncate text-[1.5rem] font-bold tracking-[-0.02em]"
            style={{ color: tierColorVar(tier) }}
          >
            {RANK_LABELS[tier]}
          </p>
        </div>
        {caption && <p className="mt-1.5 text-[0.8125rem] text-accent">{caption}</p>}
      </div>
    </div>
  );
}

/** "Why this score" / "What's holding it back" — the AI's reasoning,
 * set as two short readable paragraphs under the score. */
export function ScoreReasons({
  strengths,
  limitingFactors,
  fallback,
}: {
  strengths: string | null;
  limitingFactors: string | null;
  /** Older ratings only have a one-paragraph summary. */
  fallback?: string | null;
}) {
  if (!strengths && !limitingFactors && !fallback) return null;
  return (
    <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5">
      {strengths ? (
        <>
          <div>
            <p className="text-[0.8125rem] font-semibold">Why this score</p>
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{strengths}</p>
          </div>
          {limitingFactors && (
            <div>
              <p className="text-[0.8125rem] font-semibold">What&apos;s holding it back</p>
              <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{limitingFactors}</p>
            </div>
          )}
        </>
      ) : (
        fallback && <p className="text-[0.9375rem] leading-relaxed text-muted">{fallback}</p>
      )}
    </div>
  );
}
