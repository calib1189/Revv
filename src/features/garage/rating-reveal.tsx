"use client";

import { useEffect, useRef, useState } from "react";
import { GemIcon } from "@/components/ui/icons";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { useCountUp } from "@/features/garage/use-count-up";
import { ParticleBurst } from "@/features/garage/particle-burst";
import type { BuildRating } from "@/lib/providers/rating-provider";

type Stage = "charging" | "cracking" | "revealing" | "settled";

// The AI call itself takes somewhere around 0.9-2s+ (a real Gemini
// vision call, or the mock provider's own deliberately-similar delay —
// see generateBuildRatingAction) — this is the floor on how long the
// buildup stays on screen regardless of how fast that response actually
// comes back, so a lucky-fast response doesn't cut the suspense short.
// It never *adds* delay beyond whatever the real call already takes.
const MIN_CHARGE_MS = 1700;
const CRACK_MS = 450;
const SETTLE_DELAY_MS = 1400;
const COUNT_UP_MS = 1100;

/**
 * The "unboxing" moment for a build rating — replaces the old behavior
 * of the score just statically appearing the instant the API call
 * resolved. Charges (a neutral, tier-agnostic glow — the tier isn't
 * known yet), cracks open, then materializes the actual tier's ring
 * material (reusing the exact same rank-frame CSS every rank badge in
 * the app already uses, so what's revealed here is visually the same
 * "thing" as what shows up everywhere else) with a count-up score and a
 * particle burst in the tier's own color.
 */
export function RatingReveal({
  result,
  onDone,
}: {
  /** Null while still awaiting the real rating call — the reveal opens
   * immediately on tap and charges through however long that takes. */
  result: BuildRating | null;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<Stage>("charging");
  const [skipRequested, setSkipRequested] = useState(false);
  // Captured in an effect, not as a useRef initializer — reading the
  // clock is an impure call, and a useRef initializer still runs (and
  // is discarded) on every render even though only the first call's
  // result is ever kept.
  const chargeStartRef = useRef<number | null>(null);
  useEffect(() => {
    chargeStartRef.current = performance.now();
  }, []);

  useEffect(() => {
    if (stage !== "charging" || !result) return;
    const elapsed = chargeStartRef.current === null ? 0 : performance.now() - chargeStartRef.current;
    const remaining = skipRequested ? 0 : Math.max(0, MIN_CHARGE_MS - elapsed);
    const t = setTimeout(() => setStage("cracking"), remaining);
    return () => clearTimeout(t);
  }, [stage, result, skipRequested]);

  useEffect(() => {
    if (stage !== "cracking") return;
    const t = setTimeout(() => setStage("revealing"), CRACK_MS);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== "revealing") return;
    const t = setTimeout(() => setStage("settled"), SETTLE_DELAY_MS);
    return () => clearTimeout(t);
  }, [stage]);

  const tier = result ? rankForScore(result.score) : null;
  const color = tier ? RANK_TEXT_COLORS[tier] : "#c9b6ff";
  const revealed = stage === "revealing" || stage === "settled";
  const countUp = useCountUp(result?.score ?? 0, COUNT_UP_MS, revealed);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black">
      <div
        className={`relative flex h-44 w-44 items-center justify-center ${stage === "cracking" ? "reveal-shake" : ""}`}
      >
        {(stage === "charging" || stage === "cracking") && (
          <div className="reveal-charging-frame absolute inset-0">
            <span
              className={`reveal-charging-glow flex h-full w-full items-center justify-center text-white/90 ${
                stage === "cracking" ? "reveal-punch" : ""
              }`}
            >
              <GemIcon className="h-16 w-16" />
            </span>
          </div>
        )}

        {stage === "cracking" && (
          <span aria-hidden className="reveal-flash absolute inset-0 rounded-full bg-white" />
        )}

        {revealed && tier && (
          <>
            <div className="reveal-materialize">
              <div className={`rank-frame rank-${tier} flex h-40 w-40 items-center justify-center rounded-full`}>
                <GemIcon className="h-16 w-16" style={{ color }} />
              </div>
            </div>
            <ParticleBurst burstKey={result?.score ?? 0} colors={[color, "#ffffff", `${color}99`]} />
          </>
        )}
      </div>

      {stage === "charging" && (
        <p className="mt-8 animate-pulse text-sm text-white/60">Analyzing your build…</p>
      )}

      {revealed && tier && result && (
        <div className="reveal-text-in mt-7 flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            {result.isMock ? "Preview rating" : "Your rating"}
          </p>
          <p className="text-3xl font-bold tracking-tight" style={{ color }}>
            {RANK_LABELS[tier]}
          </p>
          <p className="text-xl font-semibold tabular-nums text-white/90">{countUp.toFixed(2)}</p>
        </div>
      )}

      {stage === "charging" && (
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
