"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  rankForScore,
  tierProgress,
  RANK_LABELS,
  RANK_TEXT_COLORS,
  RANK_AMBIENT_COLORS,
  RANK_TIERS,
  type RankTier,
} from "@/lib/rating/rank";
import { RANK_MATERIAL_ICONS, RANK_ICON_SRC } from "@/features/garage/rank-material-icons";
import {
  unknownClimbValue,
  cappedClimbValue,
  climbCeilingForScore,
  landingValue,
  landingStartValue,
  needsCorrection,
} from "@/features/garage/climb-math";
import { RevealSoundEngine } from "@/features/garage/reveal-sound";
import { hapticTierUp, hapticLanding } from "@/lib/haptics";
import type { BuildRating, BuildRatingSubscores } from "@/lib/providers/rating-provider";

type Stage = "climbing" | "anticipating" | "correcting" | "landing" | "landed" | "settled";

// However fast the real result comes back, the climb always gets at
// least this long before it's allowed to start its final approach —
// see climb-math.ts's unknownClimbValue for what's actually driving the
// displayed number during this window. MIN_CLIMB_MS + LANDING_DURATION_MS
// is the full 8s the number takes to finish counting, guaranteed
// regardless of how fast the real rating call actually comes back.
const MIN_CLIMB_MS = 6200;
// A held beat between the climb stopping and the final approach starting
// — the number freezes, the hum bends upward, and the icon holds a slow
// pulse, all as a genuine "is it going to land here" pause rather than
// going straight from climbing into landing.
const ANTICIPATION_MS = 550;
// How long the unknown-phase climb overshot past where the real score
// needs it to land takes to visibly correct back down — a real,
// explained animated stage (see needsCorrection in climb-math.ts),
// never a silent instant jump.
const CORRECTION_DURATION_MS = 750;
const LANDING_DURATION_MS = 1800;
const LANDING_RUNWAY = 7;
const SETTLE_DELAY_MS = 1600;

// RANK_TIERS is ordered highest tier first (cosmic) to lowest (bronze);
// the sound engine wants the opposite — ascending rank, 0 for bronze —
// so a climb up the ladder is also a climb up in pitch.
function ascendingRank(tier: RankTier): number {
  return RANK_TIERS.length - 1 - RANK_TIERS.findIndex((t) => t.tier === tier);
}

// Ring geometry, in the SVG's own 200-unit box.
const RING_RADIUS = 92;
/** Where each tier starts on the ring — one mark per boundary above 0. */
const TIER_MARKS = RANK_TIERS.filter((t) => t.min > 0).map((t) => t.min);

/** A point on the ring `value` (0-100) of the way round, from 12 o'clock. */
function ringPoint(value: number): { x: number; y: number } {
  const angle = (value / 100) * Math.PI * 2 - Math.PI / 2;
  return { x: 100 + RING_RADIUS * Math.cos(angle), y: 100 + RING_RADIUS * Math.sin(angle) };
}

const SUBSCORE_ROWS: { key: keyof BuildRatingSubscores; label: string }[] = [
  { key: "appearance", label: "Appearance" },
  { key: "performance", label: "Performance" },
  { key: "wheelsFitment", label: "Wheels/Fitment" },
  { key: "interior", label: "Interior" },
  { key: "modifications", label: "Modifications" },
];

function hasSubscores(subscores: BuildRatingSubscores | null | undefined): subscores is BuildRatingSubscores {
  return !!subscores && SUBSCORE_ROWS.every(({ key }) => typeof subscores[key] === "number");
}

/**
 * The build-rating moment. The score starts at 0 and climbs — fast at
 * first, slowing as it goes — for as long as the real AI call takes (it
 * doubles as the loading state), then eases into an exact landing on the
 * real score.
 *
 * Built as one instrument rather than a light show: a thin ring around
 * the badge fills with the number, with a mark at every tier boundary
 * that lights in that tier's colour as the ring passes it. The badge is
 * always the tier the *shown* number falls in, cross-fading softly at
 * each crossing with a single ping and a tick of sound and haptics; the
 * only light is one soft glow behind it, in the tier's colour, getting a
 * little stronger as the score climbs. The landing is one swell of that
 * light and the number settling. Then the ring steps back and the five
 * sub-scores fill in, followed by what earned the score.
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
  const [displayedValue, setDisplayedValueState] = useState(0);
  // The RAF loop's own `frame` closure is created once and recurses via
  // requestAnimationFrame rather than being re-created on every render
  // (same reasoning as resultRef/skipRef below) — reading `displayedValue`
  // directly from it would read whatever it was at mount forever, not
  // its current value, so anything inside that loop needs this ref.
  const displayedValueRef = useRef(0);
  // How fast the number is moving, in points per second, smoothed — sets
  // the length of the comet tail behind the ring's leading point.
  const [speed, setSpeed] = useState(0);
  const speedRef = useRef(0);
  const lastSampleRef = useRef<{ value: number; at: number } | null>(null);
  function setDisplayedValue(value: number) {
    const now = performance.now();
    const last = lastSampleRef.current;
    if (last && now > last.at) {
      const instant = Math.abs(value - last.value) / ((now - last.at) / 1000);
      speedRef.current = speedRef.current * 0.85 + instant * 0.15;
      setSpeed(speedRef.current);
    }
    lastSampleRef.current = { value, at: now };
    displayedValueRef.current = value;
    setDisplayedValueState(value);
  }
  const [skipRequested, setSkipRequested] = useState(false);
  const [levelUpKey, setLevelUpKey] = useState(0);
  // Whether the *most recent* tier change was a downgrade (only possible
  // during the "correcting" stage) — gates off the confetti/shockwave/
  // screen-flash/haptic fanfare for that one change, so a correction
  // reads as "settling on the real number" rather than another
  // celebratory level-up playing in reverse. The icon crossfade and a
  // quiet sound cue still happen either way.
  const [isDowngrade, setIsDowngrade] = useState(false);
  // The tier being faded out during a crossfade — kept mounted just long
  // enough to shrink away while the new tier's icon pops in over it,
  // instead of the old one vanishing the instant the new one appears.
  const [outgoingTier, setOutgoingTier] = useState<RankTier | null>(null);
  const outgoingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const anticipationStartedAtRef = useRef<number | null>(null);
  const correctionStartedAtRef = useRef<number | null>(null);
  const correctionFromRef = useRef(0);
  const correctionToRef = useRef(0);
  const prevTierRef = useRef<RankTier>("bronze");

  const [sound] = useState(() => new RevealSoundEngine());

  useEffect(() => {
    startedAtRef.current = performance.now();
    // Bronze is the one tier that can never be *reached* — the reveal
    // starts there, so the tier-change effect below (which only fires on
    // a change) never sees a transition into it and it plays no sound of
    // its own. Firing its level-up chime once right at the start gives
    // the very first moment the same "something just happened" cue every
    // later tier crossing gets, instead of the reveal beginning in
    // silence.
    sound.playLevelUp(ascendingRank("bronze"), RANK_TIERS.length);
    return () => {
      sound.dispose();
    };
  }, [sound]);

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
          // If the real result took longer to arrive than MIN_CLIMB_MS,
          // currentResult was null on every prior frame, so the climb
          // ran the plain uncapped unknownClimbValue the whole time —
          // cappedClimbValue below never got a chance to run, since it
          // only applies once currentResult is already known. Clamping
          // right here, at the one-time freeze, catches that case too:
          // regardless of how the number got this high, it can never be
          // shown any higher than one tier above the real score from
          // this point on. A hard clamp is fine here specifically
          // because we're freezing anyway — there's no ongoing
          // animation for it to visibly interrupt.
          const cappedFreezeValue = Math.min(
            displayedValueRef.current,
            climbCeilingForScore(currentResult.score),
          );
          setDisplayedValue(cappedFreezeValue);
          // Freeze right here rather than jumping straight into landing
          // — landingFromRef is computed once anticipation ends, from
          // whatever value it was frozen at, not a live climb value.
          anticipationStartedAtRef.current = now;
          sound.playAnticipationRiser(ANTICIPATION_MS / 1000);
          setStage("anticipating");
        } else {
          // Once the real score is already known (it just hasn't hit the
          // minimum suspense duration yet), don't let the climb wander
          // any further above it than one tier — see cappedClimbValue's
          // own comment for why this is a rescale, not a clamp.
          const value = currentResult ? cappedClimbValue(elapsed, currentResult.score) : unknownClimbValue(elapsed);
          setDisplayedValue(value);
        }
      } else if (stageRef.current === "anticipating") {
        const anticipationElapsed = now - (anticipationStartedAtRef.current ?? now);
        if (anticipationElapsed >= ANTICIPATION_MS) {
          const currentResult = resultRef.current;
          if (currentResult) {
            const frozen = displayedValueRef.current;
            if (needsCorrection(frozen, currentResult.score, LANDING_RUNWAY)) {
              // The unknown-phase climb overshot past where the real
              // score needs the final approach to start from — rather
              // than silently snapping down to that point (the score
              // visibly dropping the instant landing began), run the
              // drop itself as its own explained stage first.
              correctionFromRef.current = frozen;
              correctionToRef.current = landingStartValue(frozen, currentResult.score, LANDING_RUNWAY);
              correctionStartedAtRef.current = now;
              sound.playCorrection();
              setStage("correcting");
            } else {
              landingFromRef.current = frozen;
              landingStartedAtRef.current = now;
              setStage("landing");
            }
          }
        }
      } else if (stageRef.current === "correcting") {
        const correctionElapsed = now - (correctionStartedAtRef.current ?? now);
        const value = landingValue(
          correctionElapsed,
          CORRECTION_DURATION_MS,
          correctionFromRef.current,
          correctionToRef.current,
        );
        setDisplayedValue(value);
        if (correctionElapsed >= CORRECTION_DURATION_MS) {
          setDisplayedValue(correctionToRef.current);
          landingFromRef.current = correctionToRef.current;
          landingStartedAtRef.current = now;
          setStage("landing");
        }
      } else if (stageRef.current === "landing") {
        const currentResult = resultRef.current;
        if (!currentResult) {
          raf = requestAnimationFrame(frame);
          return;
        }
        const landingElapsed = now - (landingStartedAtRef.current ?? now);
        const value = landingValue(landingElapsed, LANDING_DURATION_MS, landingFromRef.current, currentResult.score);
        setDisplayedValue(value);
        if (landingElapsed >= LANDING_DURATION_MS) {
          setDisplayedValue(currentResult.score);
          sound.playRankLocked(rankForScore(currentResult.score));
          hapticLanding();
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
  }, [sound]);

  useEffect(() => {
    if (stage !== "landed") return;
    const t = setTimeout(() => setStage("settled"), SETTLE_DELAY_MS);
    return () => clearTimeout(t);
  }, [stage]);

  const displayedTier = rankForScore(displayedValue);

  // Fires the level-up effect every time the *displayed* tier changes —
  // during the fast climb, during the slower landing approach, doesn't
  // matter which. Deliberately not gated to any particular stage. A
  // downgrade (only possible during "correcting") gets the icon
  // crossfade and a quiet cue but not the full fanfare — see
  // isDowngrade above.
  useEffect(() => {
    if (prevTierRef.current !== displayedTier) {
      const previousTier = prevTierRef.current;
      const downgrade = ascendingRank(displayedTier) < ascendingRank(previousTier);
      prevTierRef.current = displayedTier;
      setLevelUpKey((k) => k + 1);
      setIsDowngrade(downgrade);
      if (!downgrade) {
        sound.playLevelUp(ascendingRank(displayedTier), RANK_TIERS.length);
        hapticTierUp();
      }

      setOutgoingTier(previousTier);
      if (outgoingTimeoutRef.current) clearTimeout(outgoingTimeoutRef.current);
      outgoingTimeoutRef.current = setTimeout(() => setOutgoingTier(null), 460);
    }
  }, [displayedTier, sound]);

  useEffect(() => {
    return () => {
      if (outgoingTimeoutRef.current) clearTimeout(outgoingTimeoutRef.current);
    };
  }, []);

  const landed = stage === "landed" || stage === "settled";
  const settled = stage === "settled";
  const color = RANK_TEXT_COLORS[displayedTier];
  const Icon = RANK_MATERIAL_ICONS[displayedTier];
  const OutgoingIcon = outgoingTier ? RANK_MATERIAL_ICONS[outgoingTier] : null;
  // 0 at the bottom of the ladder, 1 at the top — how strong the light is,
  // and how big the landing gets.
  const level = ascendingRank(displayedTier) / Math.max(1, RANK_TIERS.length - 1);
  const head = ringPoint(Math.min(99.999, displayedValue));
  const [whole, fraction] = displayedValue.toFixed(2).split(".");
  const progress = landed ? tierProgress(displayedValue) : null;
  const subscores = settled && result && hasSubscores(result.subscores) ? result.subscores : null;

  // The comet tail: longer the faster the number is moving.
  const tailGradientId = `reveal-tail-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  // Always a short tail while it's moving, stretching with speed.
  const tailUnits = landed || speed < 0.5 ? 0 : Math.min(13, 2 + speed * 0.3);
  const tailStart = Math.max(0, displayedValue - tailUnits);
  const tailFrom = ringPoint(tailStart);

  // Where the tier just reached begins on the ring — its mark sparks.
  const crossedMin = RANK_TIERS.find((t) => t.tier === displayedTier)?.min ?? 0;
  const spark = crossedMin > 0 ? ringPoint(crossedMin) : null;
  const rayCount = Math.round(16 + level * 20);

  const statusLabel = landed
    ? result?.isMock
      ? "Preview rating"
      : "Your rating"
    : stage === "correcting"
      ? "Recalculating"
      : "Rating your build";

  return (
    <div
      className="reveal-stage fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden overscroll-contain bg-[#050506] text-white"
      style={
        {
          "--reveal-color": color,
          "--reveal-glow": RANK_AMBIENT_COLORS[displayedTier],
          "--reveal-level": level,
        } as React.CSSProperties
      }
    >
      <div className="flex min-h-full flex-col items-center justify-center px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.24em] text-white/45">{statusLabel}</p>

        {/* The instrument: a ring that fills with the score, a mark at
            every tier boundary, the badge in the middle. Steps back to a
            smaller size once everything has landed, to make room. */}
        <div
          className={`relative mt-6 transition-[width,height] duration-700 ease-[var(--ease-ios)] ${
            settled ? "h-[10.5rem] w-[10.5rem]" : "h-[17.5rem] w-[17.5rem]"
          }`}
        >
          <span
            key={landed ? "light-landed" : "light"}
            aria-hidden
            className={`reveal-light pointer-events-none absolute -inset-[45%] rounded-full ${
              stage === "landed" ? "reveal-light-swell" : stage === "anticipating" ? "reveal-light-charge" : ""
            }`}
          />

          {/* Emerald and up: a fine dotted halo turning slowly behind it
              all once the score has landed. */}
          {landed && level >= 0.66 && (
            <div aria-hidden className="reveal-halo pointer-events-none absolute -inset-[7%]">
              <svg viewBox="0 0 200 200" className="h-full w-full">
                <circle
                  cx="100"
                  cy="100"
                  r="98"
                  fill="none"
                  stroke="var(--reveal-color)"
                  strokeWidth="1"
                  strokeDasharray="0.6 3.4"
                  strokeLinecap="round"
                  opacity="0.55"
                />
              </svg>
            </div>
          )}

          <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient
                id={tailGradientId}
                gradientUnits="userSpaceOnUse"
                x1={tailFrom.x}
                y1={tailFrom.y}
                x2={head.x}
                y2={head.y}
              >
                <stop offset="0" style={{ stopColor: "var(--reveal-color)", stopOpacity: 0 }} />
                <stop offset="1" style={{ stopColor: "#ffffff", stopOpacity: 0.95 }} />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r={RING_RADIUS} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="2.5" />
            <circle
              cx="100"
              cy="100"
              r={RING_RADIUS}
              fill="none"
              stroke="var(--reveal-color)"
              strokeWidth="2.5"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset={100 - Math.min(100, displayedValue)}
              transform="rotate(-90 100 100)"
              style={{ filter: "drop-shadow(0 0 6px var(--reveal-color))" }}
            />
            {TIER_MARKS.map((min) => {
              const point = ringPoint(min);
              const reached = displayedValue >= min;
              return (
                <circle
                  key={min}
                  cx={point.x}
                  cy={point.y}
                  r={reached ? 2.6 : 1.9}
                  fill={reached ? RANK_TEXT_COLORS[rankForScore(min)] : "rgb(255 255 255 / 0.22)"}
                  className="transition-[r,fill] duration-500"
                />
              );
            })}
            {/* The comet tail, then the leading point itself — where the
                number is right now. The point breathes during the held
                beat before the landing, and is gone once it lands. */}
            {tailUnits > 0.4 && (
              <circle
                cx="100"
                cy="100"
                r={RING_RADIUS}
                fill="none"
                stroke={`url(#${tailGradientId})`}
                strokeWidth="5"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${tailUnits} 100`}
                strokeDashoffset={-tailStart}
                transform="rotate(-90 100 100)"
                style={{ filter: "drop-shadow(0 0 5px var(--reveal-color))" }}
              />
            )}
            {!landed && displayedValue > 0.2 && (
              <circle
                cx={head.x}
                cy={head.y}
                r="4"
                fill="#ffffff"
                className={stage === "anticipating" ? "reveal-breathe" : ""}
                style={{ filter: "drop-shadow(0 0 7px var(--reveal-color))" }}
              />
            )}
          </svg>

          {/* A tier reached: its mark on the ring throws a little burst of
              sparks in that tier's colour. */}
          {levelUpKey > 0 && !isDowngrade && !landed && spark && (
            <span
              key={`spark-${levelUpKey}`}
              aria-hidden
              className="pointer-events-none absolute h-0 w-0"
              style={{ left: `${spark.x / 2}%`, top: `${spark.y / 2}%` }}
            >
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className="absolute left-0 top-0" style={{ transform: `rotate(${i * 45}deg)` }}>
                  <span
                    className="reveal-spark absolute left-0 top-[-1px] block h-[2px] w-[12px] rounded-full"
                    style={{ background: "var(--reveal-color)" }}
                  />
                </span>
              ))}
            </span>
          )}

          {/* The landing: one shockwave out from the ring, and rays shot
              outward all the way round — more of them the higher the tier. */}
          {landed && (
            <>
              <span
                aria-hidden
                className="reveal-shockwave pointer-events-none absolute inset-0 rounded-full border-2 border-[var(--reveal-color)]"
              />
              <div aria-hidden className="pointer-events-none absolute inset-0">
                {Array.from({ length: rayCount }, (_, i) => (
                  <span
                    key={i}
                    className="absolute inset-0"
                    style={{ transform: `rotate(${(i / rayCount) * 360}deg)` }}
                  >
                    <span
                      className="reveal-ray absolute left-1/2 top-[-2%] -ml-px block h-[11%] w-[2px] rounded-full"
                      style={{
                        background: "linear-gradient(to top, var(--reveal-color), transparent)",
                        animationDelay: `${(i % 3) * 40}ms`,
                      }}
                    />
                  </span>
                ))}
              </div>
            </>
          )}

          <div
            key={landed ? "badge-landed" : "badge"}
            className={`absolute inset-[22%] ${landed ? "reveal-stamp" : ""}`}
          >
            {/* Each badge gets its own positioned layer: the badge itself
                is position: relative, so two of them side by side would
                stack one under the other mid-crossfade. */}
            {OutgoingIcon && outgoingTier && (
              <div key={`out-${levelUpKey}`} className="reveal-badge-out absolute inset-0">
                <OutgoingIcon className="h-full w-full" />
              </div>
            )}
            <div key={`in-${displayedTier}`} className="reveal-badge-in absolute inset-0">
              <Icon className="h-full w-full" style={{ filter: "drop-shadow(0 10px 28px rgb(0 0 0 / 0.5))" }} />
            </div>
            {/* A shine across the badge as it lands — masked to the badge's
                own silhouette, so it only ever lights the emblem itself. */}
            {landed && (
              <span
                aria-hidden
                className="reveal-sheen pointer-events-none absolute inset-0"
                style={{
                  maskImage: `url(${RANK_ICON_SRC[displayedTier]})`,
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  WebkitMaskImage: `url(${RANK_ICON_SRC[displayedTier]})`,
                  WebkitMaskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                }}
              />
            )}
            {/* One ring leaving the badge per tier reached on the way up. */}
            {levelUpKey > 0 && !isDowngrade && !landed && (
              <span
                key={`ping-${levelUpKey}`}
                aria-hidden
                className="reveal-ping pointer-events-none absolute -inset-[12%] rounded-full border border-[var(--reveal-color)]"
              />
            )}
          </div>
        </div>

        <div className="mt-7 flex flex-col items-center text-center">
          {/* The tier name rolls in like a scoreboard at each change. */}
          <span className="block h-[1.6em] overflow-hidden text-[1.0625rem] font-semibold uppercase tracking-[0.18em]">
            <span key={displayedTier} className="reveal-ticker block" style={{ color: "var(--reveal-color)" }}>
              {RANK_LABELS[displayedTier]}
            </span>
          </span>
          <p
            key={landed ? "score-landed" : `score-${levelUpKey}`}
            aria-live="polite"
            className={`numeral mt-1 flex items-baseline leading-none ${
              landed ? "reveal-land-number" : levelUpKey > 0 && !isDowngrade ? "reveal-kick" : ""
            }`}
          >
            <span className="text-[4.75rem] font-semibold tracking-[-0.04em]">{whole}</span>
            <span className="text-[2rem] font-medium text-white/40">.{fraction}</span>
          </p>
          {progress && (
            <p
              className="reveal-rise mt-3 text-[0.8125rem] text-white/50"
              style={{ "--delay": "250ms" } as React.CSSProperties}
            >
              {progress.next && progress.pointsToNext !== null
                ? `${progress.pointsToNext.toFixed(2)} to ${RANK_LABELS[progress.next]}`
                : "The top tier"}
            </p>
          )}
        </div>

        {settled && result && (
          <div className="mt-8 flex w-full max-w-sm flex-col gap-6">
            {subscores && (
              <ul className="reveal-rise flex flex-col gap-3.5 rounded-[22px] bg-white/[0.04] p-5 ring-1 ring-inset ring-white/[0.07]">
                {SUBSCORE_ROWS.map(({ key, label }, i) => {
                  const value = Math.max(0, Math.min(100, subscores[key]));
                  const delay = { "--delay": `${150 + i * 90}ms` } as React.CSSProperties;
                  return (
                    <li key={key} className="reveal-rise" style={delay}>
                      <div className="flex items-baseline justify-between text-[0.8125rem]">
                        <span className="text-white/70">{label}</span>
                        <span className="numeral text-white/90">{Math.round(value)}</span>
                      </div>
                      <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className="reveal-bar h-full rounded-full"
                          style={{ ...delay, width: `${value}%`, background: "var(--reveal-color)" }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="reveal-rise px-1 text-center" style={{ "--delay": "650ms" } as React.CSSProperties}>
              <p className="text-[0.9375rem] leading-relaxed text-white/85">{result.strengths}</p>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-white/45">{result.limitingFactors}</p>
            </div>

            {/* Pinned to the bottom of the screen: with the breakdown and
                the write-up above, it would otherwise sit below the fold on
                a phone. The band behind it fades the text out under it. */}
            <div className="sticky bottom-0 -mb-[calc(2rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-[#050506] from-60% to-transparent pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-8">
              <button
                type="button"
                onClick={onDone}
                className="reveal-rise pressable h-12 w-full rounded-full text-[0.9375rem] font-semibold text-[#0a0a0b]"
                style={{ "--delay": "800ms", background: "var(--reveal-color)" } as React.CSSProperties}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {!landed && !skipRequested && (
          <button
            type="button"
            onClick={() => setSkipRequested(true)}
            className="mt-12 rounded-full px-4 py-2 text-[0.8125rem] font-medium text-white/35 transition-colors hover:text-white/60"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
