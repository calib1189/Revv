"use client";

import { useEffect, useRef, useState } from "react";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS, type RankTier } from "@/lib/rating/rank";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { ParticleBurst } from "@/features/garage/particle-burst";
import { unknownClimbValue, landingValue, landingStartValue } from "@/features/garage/climb-math";
import type { BuildRating } from "@/lib/providers/rating-provider";

type Stage = "climbing" | "landing" | "landed" | "settled";

// However fast the real result comes back, the climb always gets at
// least this long before it's allowed to start its final approach —
// see climb-math.ts's unknownClimbValue for what's actually driving the
// displayed number during this window.
const MIN_CLIMB_MS = 2200;
const LANDING_DURATION_MS = 1100;
const LANDING_RUNWAY = 7;
const SETTLE_DELAY_MS = 1300;

const MARQUEE_BULB_COUNT = 28;

/** Positions bulbs evenly around a rectangle's perimeter (0-100% in
 * both axes), each with a staggered animation-delay so the twinkle
 * appears to travel around the border — the same "chasing" look a real
 * casino marquee's bulbs have, computed once at module load since the
 * layout never changes between reveals. */
const MARQUEE_BULBS = Array.from({ length: MARQUEE_BULB_COUNT }, (_, i) => {
  const t = (i / MARQUEE_BULB_COUNT) * 4;
  let left: number;
  let top: number;
  if (t < 1) {
    left = t * 100;
    top = 0;
  } else if (t < 2) {
    left = 100;
    top = (t - 1) * 100;
  } else if (t < 3) {
    left = 100 - (t - 2) * 100;
    top = 100;
  } else {
    left = 0;
    top = 100 - (t - 3) * 100;
  }
  return { left: `${left}%`, top: `${top}%`, delay: (i / MARQUEE_BULB_COUNT) * 2.2 };
});

/**
 * The build-rating "unboxing" moment: the score starts at 0 and climbs
 * continuously — fast at first, slowing as it goes — for as long as the
 * real AI call takes (this doubles as the loading state), then eases
 * into an exact landing on the real score once it's ready. The tier
 * ring/icon shown is always whatever tier the *currently displayed*
 * number falls into, so every time the climb crosses a tier boundary —
 * climbing or landing, it doesn't matter which — that swap fires its
 * own level-up effect: a ring shockwave, an icon bounce, a small
 * particle burst, and a full-screen color flash, the same "the whole
 * cabinet lights up" feeling a real slot machine gives on every step
 * toward a win, not just the reels themselves. Landing gets the same
 * treatment turned up further — a bigger particle burst, a screen
 * shake, and a chasing marquee-bulb border around the whole screen.
 */
export function RatingReveal({
  result,
  onDone,
}: {
  /** Null while still awaiting the real rating call. */
  result: BuildRating | null;
  onDone: () => void;
}) {
  const [stage, setStageState] = useState<Stage>("climbing");
  const [displayedValue, setDisplayedValue] = useState(0);
  const [skipRequested, setSkipRequested] = useState(false);
  const [levelUpKey, setLevelUpKey] = useState(0);

  const stageRef = useRef<Stage>("climbing");
  function setStage(next: Stage) {
    stageRef.current = next;
    setStageState(next);
  }

  const resultRef = useRef(result);
  useEffect(() => {
    resultRef.current = result;
  }, [result]);
  const skipRef = useRef(skipRequested);
  useEffect(() => {
    skipRef.current = skipRequested;
  }, [skipRequested]);

  const startedAtRef = useRef<number | null>(null);
  const landingFromRef = useRef(0);
  const landingStartedAtRef = useRef<number | null>(null);
  const prevTierRef = useRef<RankTier>("bronze");

  useEffect(() => {
    startedAtRef.current = performance.now();
  }, []);

  // The one continuous animation loop, running for the component's
  // whole lifetime (started once, deliberately not restarted when
  // `result` arrives — see rating-reveal's earlier bug history for why
  // that matters under React's dev Strict Mode specifically). Reads
  // `stage` via a ref rather than depending on it, since flipping
  // stages happens *inside* this same loop.
  useEffect(() => {
    let raf: number;
    let cancelled = false;

    function frame(now: number) {
      if (cancelled) return;
      const start = startedAtRef.current ?? now;
      const elapsed = now - start;

      if (stageRef.current === "climbing") {
        const currentResult = resultRef.current;
        const pastMinimum = skipRef.current || elapsed >= MIN_CLIMB_MS;
        if (currentResult && pastMinimum) {
          const unknownValue = unknownClimbValue(elapsed);
          landingFromRef.current = landingStartValue(unknownValue, currentResult.score, LANDING_RUNWAY);
          landingStartedAtRef.current = now;
          setStage("landing");
        } else {
          setDisplayedValue(unknownClimbValue(elapsed));
        }
      } else if (stageRef.current === "landing") {
        const currentResult = resultRef.current;
        if (!currentResult) {
          raf = requestAnimationFrame(frame);
          return;
        }
        const landingElapsed = now - (landingStartedAtRef.current ?? now);
        setDisplayedValue(landingValue(landingElapsed, LANDING_DURATION_MS, landingFromRef.current, currentResult.score));
        if (landingElapsed >= LANDING_DURATION_MS) {
          setDisplayedValue(currentResult.score);
          setStage("landed");
          return;
        }
      } else {
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (stage !== "landed") return;
    const t = setTimeout(() => setStage("settled"), SETTLE_DELAY_MS);
    return () => clearTimeout(t);
  }, [stage]);

  const displayedTier = rankForScore(displayedValue);

  // Fires the level-up effect every time the *displayed* tier changes —
  // during the fast climb, during the slower landing approach, doesn't
  // matter which. Deliberately not gated to any particular stage.
  useEffect(() => {
    if (prevTierRef.current !== displayedTier) {
      prevTierRef.current = displayedTier;
      setLevelUpKey((k) => k + 1);
    }
  }, [displayedTier]);

  const landed = stage === "landed" || stage === "settled";
  const color = RANK_TEXT_COLORS[displayedTier];
  const Icon = RANK_MATERIAL_ICONS[displayedTier];

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-black ${
        stage === "landed" ? "reveal-landing-shake" : ""
      }`}
    >
      {/* Full-screen color wash — replays on every tier-up via the
          key-remount trick, same as the contained ring pulse. */}
      <span
        key={`screen-flash-${levelUpKey}`}
        aria-hidden
        className="reveal-screen-flash pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(circle, ${color}66 0%, transparent 70%)` }}
      />

      {/* Chasing marquee-bulb border — only once it's actually landed,
          the "the whole cabinet lights up" moment, not the whole climb. */}
      {landed &&
        MARQUEE_BULBS.map((b, i) => (
          <span
            key={i}
            aria-hidden
            className="marquee-bulb"
            style={{ left: b.left, top: b.top, animationDelay: `${b.delay}s`, color }}
          />
        ))}

      <div className="relative flex h-44 w-44 items-center justify-center">
        <div aria-hidden className={`reveal-light-rays ${landed ? "reveal-light-rays-bright" : ""}`} style={{ color }} />

        <div key={`ring-${levelUpKey}`} className={landed ? "reveal-materialize" : "tier-levelup-icon-pop"}>
          <div className={`rank-frame rank-${displayedTier} flex h-40 w-40 items-center justify-center rounded-full p-6`}>
            <Icon className="h-full w-full drop-shadow-lg" />
          </div>
        </div>

        {/* Shockwave ring on every tier crossing, key-remounted so the
            one-shot CSS animation replays each time. */}
        <span
          key={`pulse-${levelUpKey}`}
          aria-hidden
          className="tier-levelup-ring pointer-events-none absolute inset-0 rounded-full border-2"
          style={{ borderColor: color }}
        />
        {levelUpKey > 0 && (
          <ParticleBurst key={`sparkle-${levelUpKey}`} burstKey={levelUpKey} colors={[color, "#ffffff"]} />
        )}

        {stage === "landed" && (
          <span aria-hidden className="reveal-flash absolute inset-0 rounded-full bg-white" />
        )}
        {landed && (
          <ParticleBurst
            burstKey={`final-${result?.score ?? 0}`}
            colors={[color, "#ffffff", `${color}99`, "#ffd166"]}
            count={160}
            speedMultiplier={1.4}
          />
        )}
      </div>

      <div className="relative mt-7 flex flex-col items-center gap-1 text-center">
        {!landed && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Rating your build…</p>
        )}
        {landed && result && (
          <p className="reveal-text-in text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            {result.isMock ? "Preview rating" : "Your rating"}
          </p>
        )}
        <p className="text-3xl font-bold tracking-tight transition-colors duration-150" style={{ color }}>
          {RANK_LABELS[displayedTier]}
        </p>
        <p className="text-xl font-semibold tabular-nums text-white/90">{displayedValue.toFixed(2)}</p>
      </div>

      {!landed && !skipRequested && (
        <button
          type="button"
          onClick={() => setSkipRequested(true)}
          className="relative mt-10 text-xs text-white/40 underline underline-offset-2"
        >
          Skip
        </button>
      )}

      {stage === "settled" && (
        <button
          type="button"
          onClick={onDone}
          className="reveal-text-in relative mt-10 rounded-full bg-accent px-8 py-3 text-sm font-semibold text-accent-foreground"
        >
          Continue
        </button>
      )}
    </div>
  );
}
