"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateBuildRatingAction, confirmBuildRatingAction } from "@/features/garage/rating-actions";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { RatingReveal } from "@/features/garage/rating-reveal";
import { RatingBreakdownTrigger, type RatingHistoryPoint } from "@/features/garage/rating-breakdown-modal";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { GemIcon, ChevronRightIcon } from "@/components/ui/icons";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import type { BuildRating, BuildRatingSubscores } from "@/lib/providers/rating-provider";
import type { RankPosition } from "@/lib/rating/rank-position";

export function RateBuildPanel({
  vehicleId,
  currentScore,
  currentStrengths,
  currentLimitingFactors,
  currentSubscores,
  topPercent,
  ratingHistory,
  rankPosition,
}: {
  vehicleId: string;
  currentScore: number | null;
  currentStrengths: string | null;
  currentLimitingFactors: string | null;
  currentSubscores: BuildRatingSubscores | null;
  topPercent: number | null;
  ratingHistory: RatingHistoryPoint[];
  rankPosition: RankPosition | null;
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pending, setPending] = useState<BuildRating | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Opens the moment "Rate my build" is tapped, not once the response
  // arrives — the reveal's own charging stage is what covers the real
  // network latency, so it needs to be on screen before that latency
  // even starts. revealResult stays null until the API call actually
  // resolves; the reveal component charges for as long as that takes.
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealResult, setRevealResult] = useState<BuildRating | null>(null);

  async function handleGenerate() {
    setError(null);
    setPending(null);
    setRevealResult(null);
    setIsGenerating(true);
    setIsRevealing(true);
    try {
      const result = await generateBuildRatingAction(vehicleId);
      if (result.error) {
        setError(result.error);
        setIsRevealing(false);
      } else if (result.data) {
        setRevealResult(result.data);
      }
    } catch {
      setError("Couldn't rate that build. Try again.");
      setIsRevealing(false);
    } finally {
      setIsGenerating(false);
    }
  }

  // Only once the reveal has actually played through does the existing
  // "New rating" card (strengths/limiting factors, Show this rating/
  // Discard) take over — the reveal is a moment in front of that card,
  // not a replacement for the review step it already had.
  function handleRevealDone() {
    setIsRevealing(false);
    if (revealResult) setPending(revealResult);
  }

  async function handleConfirm() {
    if (!pending) return;
    setIsConfirming(true);
    setError(null);
    try {
      const result = await confirmBuildRatingAction(
        vehicleId,
        pending.score,
        pending.strengths,
        pending.limitingFactors,
        pending.subscores,
        pending.isMock,
      );
      if (result.error) {
        setError(result.error);
      } else {
        setPending(null);
        router.refresh();
      }
    } finally {
      setIsConfirming(false);
    }
  }

  if (pending) {
    const tier = rankForScore(pending.score);
    const Icon = RANK_MATERIAL_ICONS[tier];
    return (
      <div className="glass-raised rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <Icon className="h-16 w-16 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">New rating</p>
            <p className="text-xl font-bold tracking-tight" style={{ color: RANK_TEXT_COLORS[tier] }}>
              {RANK_LABELS[tier]} · {pending.score.toFixed(2)}
            </p>
          </div>
          {pending.isMock && (
            <span className="ml-auto flex-shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              Mock
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Why this score
            </p>
            <p className="mt-1 text-sm">{pending.strengths}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              What&apos;s holding it back
            </p>
            <p className="mt-1 text-sm">{pending.limitingFactors}</p>
          </div>
        </div>
        {error && (
          <div className="mt-3">
            <Callout tone="danger">{error}</Callout>
          </div>
        )}
        <div className="mt-4 flex items-center gap-3">
          <Button
            type="button"
            disabled={isConfirming}
            onClick={handleConfirm}
            className="px-4 py-2 text-sm"
          >
            {isConfirming ? "Saving…" : "Show this rating"}
          </Button>
          <button
            type="button"
            onClick={() => setPending(null)}
            className="px-1 py-2 text-sm text-muted hover:text-foreground"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  if (currentScore != null) {
    const tier = rankForScore(currentScore);
    const Icon = RANK_MATERIAL_ICONS[tier];
    return (
      <>
        {isRevealing && <RatingReveal result={revealResult} onDone={handleRevealDone} />}
        <div className="glass-raised rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3">
          <RatingBreakdownTrigger
            score={currentScore}
            subscores={currentSubscores}
            topPercent={topPercent}
            history={ratingHistory}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Icon className="h-16 w-16 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Build rating</p>
                <p
                  className="truncate text-xl font-bold tracking-tight"
                  style={{ color: RANK_TEXT_COLORS[tier] }}
                >
                  {RANK_LABELS[tier]} · {currentScore.toFixed(2)}
                </p>
              </div>
            </div>
          </RatingBreakdownTrigger>
          <Button
            type="button"
            variant="secondary"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="flex-shrink-0 px-3 py-1.5 text-sm"
          >
            {isGenerating ? "Rating…" : "Re-rate"}
          </Button>
        </div>

        {(currentStrengths || currentLimitingFactors) && (
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            {currentStrengths && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Why this score
                </p>
                <p className="mt-1 text-sm text-muted">{currentStrengths}</p>
              </div>
            )}
            {currentLimitingFactors && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  What&apos;s holding it back
                </p>
                <p className="mt-1 text-sm text-muted">{currentLimitingFactors}</p>
              </div>
            )}
          </div>
        )}

        {rankPosition && (
          <Link
            href="/leaderboard"
            className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-accent/10 p-3 transition-colors hover:bg-accent/15"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">#{rankPosition.rank} on the leaderboard</p>
              <p className="mt-0.5 text-xs text-muted">
                {rankPosition.gapToNext != null
                  ? `${rankPosition.gapToNext.toFixed(2)} points to pass #${rankPosition.rank - 1}`
                  : "Nobody's ahead of you"}
              </p>
            </div>
            <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-muted" />
          </Link>
        )}

        {error && (
          <div className="mt-3">
            <Callout tone="danger">{error}</Callout>
          </div>
        )}

        <Link
          href="/leaderboard"
          className="mt-4 inline-block text-xs font-medium text-accent hover:underline"
        >
          See how tiers work →
        </Link>
      </div>
      </>
    );
  }

  return (
    <>
      {isRevealing && <RatingReveal result={revealResult} onDone={handleRevealDone} />}
      <div className="glass-raised rounded-3xl p-6">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <GemIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight">Rate my build</h2>
          <p className="mt-0.5 text-sm text-muted">
            Get a tier, a score out of 100, and exactly what&apos;s holding it back.
          </p>
        </div>
      </div>
      <Button
        type="button"
        disabled={isGenerating}
        onClick={handleGenerate}
        className="mt-4 w-full sm:w-auto sm:px-6"
      >
        {isGenerating ? "Rating…" : "Rate my build"}
      </Button>
      {error && (
        <div className="mt-3">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}
      </div>
    </>
  );
}
