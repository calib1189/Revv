"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  generateBuildRatingAction,
  confirmBuildRatingAction,
  discardPendingRatingAction,
} from "@/features/garage/rating-actions";
import { AiDisclosure } from "@/features/garage/ai-disclosure";
import { ShareScoreButton } from "@/features/garage/vehicle-share-button";
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
  shareText,
  savedPending,
  hasPhotos,
}: {
  vehicleId: string;
  /** What goes out with the link when the owner shares their score. */
  shareText: string;
  currentScore: number | null;
  currentStrengths: string | null;
  currentLimitingFactors: string | null;
  currentSubscores: BuildRatingSubscores | null;
  topPercent: number | null;
  ratingHistory: RatingHistoryPoint[];
  rankPosition: RankPosition | null;
  /** A rating generated earlier but never saved. It stays on the server
   * (and counts toward the 24h limit), so it's offered again here rather
   * than leaving "rate again in 23h" as the only thing they can see. */
  savedPending: BuildRating | null;
  /** The AI rates from photos; without one, point at adding a photo. */
  hasPhotos: boolean;
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pending, setPending] = useState<BuildRating | null>(savedPending);
  const [isDiscarding, setIsDiscarding] = useState(false);
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
    } catch {
      setError("Couldn't save that rating. Check your connection and try again.");
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleDiscard() {
    setIsDiscarding(true);
    setError(null);
    try {
      const result = await discardPendingRatingAction(vehicleId);
      if (result.error) setError(result.error);
      else setPending(null);
    } catch {
      setError("Couldn't discard that rating. Check your connection and try again.");
    } finally {
      setIsDiscarding(false);
    }
  }

  if (pending) {
    return (
      <div className="glass-raised elev-2 rounded-[28px] p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[0.9375rem] font-semibold">{currentScore != null ? "Your new score" : "Your score is ready"}</p>
          {pending.isMock && (
            <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
              Mock
            </span>
          )}
        </div>
        <ScoreHero
          score={pending.score}
          caption={
            currentScore != null
              ? `Not saved yet. Your current score of ${currentScore.toFixed(2)} stays until you save this one.`
              : "Not saved yet. Save it to put your car on the leaderboard."
          }
        />
        <ScoreReasons strengths={pending.strengths} limitingFactors={pending.limitingFactors} />
        {error && (
          <div className="mt-4">
            <Callout tone="danger">{error}</Callout>
          </div>
        )}
        <Button
          type="button"
          disabled={isConfirming || isDiscarding}
          onClick={handleConfirm}
          className="mt-5 h-12 w-full text-[1rem] font-semibold"
        >
          {isConfirming ? "Saving…" : "Save score"}
        </Button>
        <button
          type="button"
          disabled={isConfirming || isDiscarding}
          onClick={handleDiscard}
          className="mt-2 h-10 w-full text-[0.875rem] font-medium text-muted disabled:opacity-50"
        >
          {isDiscarding
            ? "Discarding…"
            : currentScore != null
              ? "Keep my current score"
              : "Discard"}
        </button>
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

          <div className="mt-5">
            <ShareScoreButton vehicleId={vehicleId} text={shareText} />
          </div>
          <div className="mt-2.5 flex gap-2.5">
            {/* Never narrower than its label: min-w-0 here let a phone
                squeeze "How tiers work" onto two lines in a one-line pill. */}
            <Link href="/leaderboard" className="flex-1">
              <Button variant="secondary" className="h-11 w-full whitespace-nowrap px-3 text-[0.9375rem] font-semibold">
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
        {hasPhotos ? (
          <Button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="mt-6 h-12 w-full max-w-xs text-[1rem] font-semibold"
          >
            {isGenerating ? "Rating…" : "Rate my build"}
          </Button>
        ) : (
          <>
            <a href="#manage" className="mt-6 block w-full max-w-xs">
              <Button type="button" tabIndex={-1} className="h-12 w-full text-[1rem] font-semibold">
                Add a photo to get rated
              </Button>
            </a>
            <p className="mt-2 max-w-xs text-[0.8125rem] text-muted">The AI rates your car from its photos.</p>
          </>
        )}
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
