"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateBuildRatingAction, confirmBuildRatingAction } from "@/features/garage/rating-actions";
import { AiDisclosure } from "@/features/garage/ai-disclosure";
import { RatingReveal } from "@/features/garage/rating-reveal";
import { ScoreHero, ScoreReasons } from "@/features/garage/score-hero";
import { RatingBreakdownTrigger, type RatingHistoryPoint } from "@/features/garage/rating-breakdown-modal";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { GemIcon, ChevronRightIcon } from "@/components/ui/icons";
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
      // pending here is only ever used to render the "New rating"
      // preview card below — the actual save reads the server's own
      // stored copy of this same rating, not these values (see
      // confirmBuildRatingAction's doc comment).
      const result = await confirmBuildRatingAction(vehicleId);
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
    return (
      <div className="glass-raised elev-2 rounded-[28px] p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[0.9375rem] font-semibold">New rating</p>
          {pending.isMock && (
            <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
              Mock
            </span>
          )}
        </div>
        <ScoreHero score={pending.score} caption="Only you can see this until you choose to show it" />
        <ScoreReasons strengths={pending.strengths} limitingFactors={pending.limitingFactors} />
        {error && (
          <div className="mt-4">
            <Callout tone="danger">{error}</Callout>
          </div>
        )}
        <div className="mt-5 flex gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPending(null)}
            className="h-11 flex-1 text-[0.9375rem] font-semibold"
          >
            Discard
          </Button>
          <Button
            type="button"
            disabled={isConfirming}
            onClick={handleConfirm}
            className="h-11 flex-1 text-[0.9375rem] font-semibold"
          >
            {isConfirming ? "Saving…" : "Show rating"}
          </Button>
        </div>
      </div>
    );
  }

  if (currentScore != null) {
    return (
      <>
        {isRevealing && <RatingReveal result={revealResult} onDone={handleRevealDone} />}
        <div className="glass-raised elev-2 rounded-[28px] p-5 sm:p-6">
          <RatingBreakdownTrigger
            score={currentScore}
            subscores={currentSubscores}
            topPercent={topPercent}
            history={ratingHistory}
            className="block w-full text-left"
          >
            <ScoreHero score={currentScore} />
          </RatingBreakdownTrigger>

          <ScoreReasons strengths={currentStrengths} limitingFactors={currentLimitingFactors} />

          {rankPosition && (
            <Link
              href="/leaderboard"
              className="pressable mt-5 flex items-center gap-3 rounded-[18px] bg-accent/10 px-4 py-3"
            >
              <span className="numeral text-[1.375rem] leading-none text-accent">#{rankPosition.rank}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.875rem] font-semibold">On the leaderboard</p>
                <p className="mt-0.5 text-[0.8125rem] text-muted">
                  {rankPosition.gapToNext != null
                    ? `${rankPosition.gapToNext.toFixed(2)} points to pass #${rankPosition.rank - 1}`
                    : "Nobody's ahead of you"}
                </p>
              </div>
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted" />
            </Link>
          )}

          {error && (
            <div className="mt-4">
              <Callout tone="danger">{error}</Callout>
            </div>
          )}

          <div className="mt-5 flex gap-2.5">
            <Link href="/leaderboard" className="min-w-0 flex-1">
              <Button variant="secondary" className="h-11 w-full text-[0.9375rem] font-semibold">
                How tiers work
              </Button>
            </Link>
            <Button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="h-11 flex-1 text-[0.9375rem] font-semibold"
            >
              {isGenerating ? "Rating…" : "Re-rate"}
            </Button>
          </div>
          <AiDisclosure className="mt-3" />
        </div>
      </>
    );
  }

  return (
    <>
      {isRevealing && <RatingReveal result={revealResult} onDone={handleRevealDone} />}
      <div className="glass-raised elev-2 flex flex-col items-center rounded-[28px] px-6 py-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/12 text-accent">
          <GemIcon className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-[1.375rem] font-bold tracking-[-0.02em]">Rate this build</h2>
        <p className="mt-1.5 max-w-xs text-[0.9375rem] leading-relaxed text-muted">
          Get a tier, a score out of 100, and exactly what&apos;s holding it back.
        </p>
        <Button
          type="button"
          disabled={isGenerating}
          onClick={handleGenerate}
          className="mt-6 h-12 w-full max-w-xs text-[1rem] font-semibold"
        >
          {isGenerating ? "Rating…" : "Rate my build"}
        </Button>
        <AiDisclosure className="mt-3 max-w-xs" />
        {error && (
          <div className="mt-4 w-full">
            <Callout tone="danger">{error}</Callout>
          </div>
        )}
      </div>
    </>
  );
}
