"use client";

import { useEffect, useRef, useState } from "react";
import { GemIcon } from "@/components/ui/icons";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS, RANK_TIERS, type RankTier } from "@/lib/rating/rank";
import { useCountUp } from "@/features/garage/use-count-up";
import { ParticleBurst } from "@/features/garage/particle-burst";
import type { BuildRating } from "@/lib/providers/rating-provider";

type Stage = "climbing" | "landed" | "settled";

// Ascending — bronze first, cosmic last. RANK_TIERS itself is ordered
// highest-first (it's built for rankForScore's "first match wins" logic),
// so this is that same single source of truth, just walked backwards.
const TIER_LADDER: RankTier[] = [...RANK_TIERS].reverse().map((t) => t.tier);
const MIN_BY_TIER: Record<RankTier, number> = Object.fromEntries(
  RANK_TIERS.map((t) => [t.tier, t.min]),
) as Record<RankTier, number>;

// A brisk, constant climb while the tier is still unknown/far away —
// this is what makes it read as a real slot-machine-style climb rather
// than a slow crawl. The three DECELERATE_DELAYS kick in only once the
// climb is genuinely closing in on the real answer, each step slower
// than the last, so the landing itself always feels earned rather than
// arbitrary — the same "spinning wheel loses momentum" cue every real
// slot machine / gacha reveal uses.
const CLIMB_STEP_MS = 140;
const DECELERATE_DELAYS = [230, 380, 620]; // 3 tiers out, 2 out, 1 out
// However fast the real result comes back, the climb always gets at
// least this long to actually feel like a climb — a bronze result that
// happened to resolve instantly shouldn't skip straight to landing.
const MIN_CLIMB_MS = 2400;
const SETTLE_DELAY_MS = 1500;
const COUNT_UP_MS = 900;

/**
 * The "unboxing" moment for a build rating. Climbs the tier ladder from
 * Bronze, one rank at a time, accelerating while the outcome is still
 * unknown and decelerating into an exact landing on the real tier —
 * "slowly climbs the ranks till it hits your exact score and rank,"
 * not a generic loading spinner before a single reveal. The climb loop
 * itself doubles as the loading state for the real AI call: it just
 * keeps lapping the ladder for as long as that takes.
 */
export function RatingReveal({
  result,
  onDone,
}: {
  /** Null while still awaiting the real rating call. */
  result: BuildRating | null;
  onDone: () => void;
}) {
  const [displayTierIndex, setDisplayTierIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("climbing");
  const [skipRequested, setSkipRequested] = useState(false);

  // Read inside the climb loop via refs, not effect dependencies — the
  // loop is a single self-scheduling setTimeout chain started once on
  // mount, deliberately not restarted every time `result` arrives, so
  // the in-flight step's own delay is never disrupted by that arrival.
  const resultRef = useRef(result);
  useEffect(() => {
    resultRef.current = result;
  }, [result]);
  const skipRef = useRef(skipRequested);
  useEffect(() => {
    skipRef.current = skipRequested;
  }, [skipRequested]);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    startedAtRef.current = performance.now();
  }, []);

  useEffect(() => {
    // No "already started" guard here on purpose — React's dev Strict
    // Mode runs this effect through mount → cleanup → mount once, and a
    // guard that only allows the loop to start once actively breaks
    // that: the first mount's chain gets torn down by the deliberate
    // cleanup below, and a guard would then block the second (real,
    // persisting) mount from ever starting its own. The cleanup itself
    // is what makes re-running this effect safe, the same way it would
    // be for any other effect.
    let cancelled = false;
    let index = 0;
    // Tracked so the effect cleanup can actually clear whatever's
    // currently pending — step()'s own return value is never read by
    // anything (it's called as a bare statement, both initially and
    // from inside the scheduled callback itself), so returning a
    // cleanup closure from step() the way a normal effect would did
    // nothing: on unmount, a stray already-scheduled timeout would
    // still fire once and call setState on an unmounted component.
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function scheduleStep(delay: number) {
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        index = (index + 1) % TIER_LADDER.length;
        setDisplayTierIndex(index);
        step();
      }, delay);
    }

    function step() {
      if (cancelled) return;
      const currentResult = resultRef.current;
      const elapsed = startedAtRef.current === null ? 0 : performance.now() - startedAtRef.current;
      const pastMinimum = skipRef.current || elapsed >= MIN_CLIMB_MS;

      if (currentResult && pastMinimum) {
        const targetIndex = TIER_LADDER.indexOf(rankForScore(currentResult.score));
        const distance = (targetIndex - index + TIER_LADDER.length) % TIER_LADDER.length;
        if (distance === 0) {
          setStage("landed");
          return;
        }
        const delay =
          distance <= DECELERATE_DELAYS.length ? DECELERATE_DELAYS[DECELERATE_DELAYS.length - distance] : CLIMB_STEP_MS;
        scheduleStep(delay);
        return;
      }

      scheduleStep(CLIMB_STEP_MS);
    }
    step();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (stage !== "landed") return;
    const t = setTimeout(() => setStage("settled"), SETTLE_DELAY_MS);
    return () => clearTimeout(t);
  }, [stage]);

  const climbingTier = TIER_LADDER[displayTierIndex];
  const finalTier = result ? rankForScore(result.score) : null;
  const landed = stage === "landed" || stage === "settled";
  const displayedTier = landed && finalTier ? finalTier : climbingTier;
  const color = RANK_TEXT_COLORS[displayedTier];
  // Starts from the landed tier's own minimum, not 0 — the climb was
  // already showing that number a moment ago, so the count-up should
  // continue upward from there to the exact real score, not jump back
  // to zero first. See use-count-up.ts's `from` param.
  const countUp = useCountUp(
    result?.score ?? MIN_BY_TIER[displayedTier],
    COUNT_UP_MS,
    landed,
    finalTier ? MIN_BY_TIER[finalTier] : 0,
  );
  const displayedScore = landed ? countUp : MIN_BY_TIER[displayedTier];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black">
      <div className={`relative flex h-44 w-44 items-center justify-center ${stage === "landed" ? "reveal-shake" : ""}`}>
        <div className={landed ? "reveal-materialize" : ""}>
          <div
            className={`rank-frame rank-${displayedTier} flex h-40 w-40 items-center justify-center rounded-full`}
          >
            <GemIcon className="h-16 w-16" style={{ color }} />
          </div>
        </div>

        {stage === "landed" && (
          <span aria-hidden className="reveal-flash absolute inset-0 rounded-full bg-white" />
        )}

        {landed && <ParticleBurst burstKey={result?.score ?? 0} colors={[color, "#ffffff", `${color}99`]} />}
      </div>

      <div className="mt-7 flex flex-col items-center gap-1 text-center">
        {!landed && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Rating your build…</p>
        )}
        {landed && result && (
          <p className="reveal-text-in text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            {result.isMock ? "Preview rating" : "Your rating"}
          </p>
        )}
        <p
          className={`text-3xl font-bold tracking-tight transition-colors duration-150 ${landed ? "reveal-text-in" : ""}`}
          style={{ color }}
        >
          {RANK_LABELS[displayedTier]}
        </p>
        <p className="text-xl font-semibold tabular-nums text-white/90">{displayedScore.toFixed(2)}</p>
      </div>

      {!landed && !skipRequested && (
        <button
          type="button"
          onClick={() => setSkipRequested(true)}
          className="mt-10 text-xs text-white/40 underline underline-offset-2"
        >
          Skip
        </button>
      )}

      {stage === "settled" && (
        <button
          type="button"
          onClick={onDone}
          className="reveal-text-in mt-10 rounded-full bg-accent px-8 py-3 text-sm font-semibold text-accent-foreground"
        >
          Continue
        </button>
      )}
    </div>
  );
}
