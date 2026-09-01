"use client";

import { useEffect, useRef, useState } from "react";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS, RANK_AMBIENT_COLORS, RANK_TIERS, type RankTier } from "@/lib/rating/rank";
import { RANK_MATERIAL_ICONS, RANK_ICON_SRC } from "@/features/garage/rank-material-icons";
import { ParticleBurst } from "@/features/garage/particle-burst";
import { CosmicStarfield } from "@/features/garage/cosmic-starfield";
import { EmeraldAura } from "@/features/garage/emerald-aura";
import { DiamondPrism } from "@/features/garage/diamond-prism";
import { RubyEmbers } from "@/features/garage/ruby-embers";
import { unknownClimbValue, landingValue, landingStartValue, needsCorrection } from "@/features/garage/climb-math";
import { RevealSoundEngine } from "@/features/garage/reveal-sound";
import { hapticTierUp, hapticLanding } from "@/lib/haptics";
import type { BuildRating } from "@/lib/providers/rating-provider";

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
 * toward a win, not just the reels themselves. The background itself is
 * never flat — a slow-rotating color sweep behind everything, always
 * the current tier's own color, cross-fading as the tier changes.
 * Landing gets the same treatment turned up further — a bigger particle
 * burst and a screen shake.
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
  function setDisplayedValue(value: number) {
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
    sound.startClimbHum();
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
          // Freeze right here rather than jumping straight into landing
          // — landingFromRef is computed once anticipation ends, from
          // whatever value it was frozen at, not a live climb value.
          anticipationStartedAtRef.current = now;
          sound.playAnticipationRiser(ANTICIPATION_MS / 1000);
          setStage("anticipating");
        } else {
          const value = unknownClimbValue(elapsed);
          setDisplayedValue(value);
          sound.updateClimbPitch(value);
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
        sound.updateClimbPitch(value);
        if (landingElapsed >= LANDING_DURATION_MS) {
          setDisplayedValue(currentResult.score);
          sound.stopClimbHum();
          sound.playLanding(ascendingRank(rankForScore(currentResult.score)), RANK_TIERS.length);
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
      outgoingTimeoutRef.current = setTimeout(() => setOutgoingTier(null), 380);
    }
  }, [displayedTier, sound]);

  useEffect(() => {
    return () => {
      if (outgoingTimeoutRef.current) clearTimeout(outgoingTimeoutRef.current);
    };
  }, []);

  const landed = stage === "landed" || stage === "settled";
  const color = RANK_TEXT_COLORS[displayedTier];
  const ambientColor = RANK_AMBIENT_COLORS[displayedTier];
  const Icon = RANK_MATERIAL_ICONS[displayedTier];
  const OutgoingIcon = outgoingTier ? RANK_MATERIAL_ICONS[outgoingTier] : null;
  // 0 (bronze) through 1 (cosmic) — once landed, displayedTier already
  // *is* the final tier (displayedValue was just set to the exact
  // final score), so this can be read straight off it rather than
  // needing the result prop's score again. Scales the landing shake and
  // the size of the final confetti burst so the actual top tier is the
  // biggest-feeling landing, not every tier hitting the same.
  const dramaIntensity = ascendingRank(displayedTier) / Math.max(1, RANK_TIERS.length - 1);
  // A screen shake on every single landing (bronze included) undersells
  // the ones that should actually feel like an impact — only gold and
  // above (dramaIntensity > 0.4, roughly the top half of the ladder)
  // shake at all.
  const isMajorReveal = dramaIntensity > 0.4;

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black reveal-screen-corners ${
        stage === "landed" && isMajorReveal ? "reveal-landing-shake" : ""
      }`}
      style={{ "--shake-intensity": 1 + dramaIntensity * 1.3 } as React.CSSProperties}
    >
      {/* Bespoke top-tier landing backdrops — each of these gets its own
          distinct scene instead of just a bigger version of every other
          tier's effects (the same idea CosmicStarfield started with). */}
      {landed && displayedTier === "cosmic" && <CosmicStarfield />}
      {landed && displayedTier === "emerald" && <EmeraldAura />}
      {landed && displayedTier === "diamond" && <DiamondPrism />}
      {landed && displayedTier === "ruby" && <RubyEmbers />}

      {/* The reveal's whole background — always the current tier's
          color, always moving, cross-fading smoothly as the tier
          changes (the transition lives on the CSS custom property). */}
      <span
        aria-hidden
        className="reveal-ambient-glow pointer-events-none absolute inset-0"
        style={{ "--reveal-color": ambientColor } as React.CSSProperties}
      />
      <span
        aria-hidden
        className="reveal-ambient-sweep pointer-events-none absolute inset-0"
        style={{ "--reveal-color": ambientColor } as React.CSSProperties}
      />

      {/* Full-screen color wash — replays on every tier-up via the
          key-remount trick, same as the contained ring pulse. Skipped
          for a downgrade (a correction, not an achievement) — see
          isDowngrade above. */}
      {!isDowngrade && (
        <span
          key={`screen-flash-${levelUpKey}`}
          aria-hidden
          className="reveal-screen-flash pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(circle, ${color}66 0%, transparent 70%)` }}
        />
      )}

      <div className="relative flex h-52 w-52 items-center justify-center">
        {/* Confetti renders before (so it paints behind) the icon itself
            — it's a backdrop effect, not something that should ever
            overlap the badge art. Needs real room to fly outward and
            fade before it runs out of canvas — sized to the small icon
            box itself, it hit a hard clip right at that box's edge,
            which read as a square frame around the icon once enough
            particles piled up against it (worst on the final burst,
            with the most particles). This wrapper gives it a canvas
            several times bigger than the icon, well past where
            particles have already faded out by the time they'd reach
            its edge. Colors stay within this tier's own palette (its
            text color, its ambient wash, white for sparkle) rather than
            mixing in an unrelated fixed color, so the burst actually
            reads as "this tier," not just "confetti." */}
        {levelUpKey > 0 && !isDowngrade && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2">
            <ParticleBurst
              key={`sparkle-${levelUpKey}`}
              burstKey={levelUpKey}
              colors={[color, ambientColor, "#ffffff"]}
              count={Math.round(40 + dramaIntensity * 70)}
              speedMultiplier={0.8 + dramaIntensity * 0.6}
            />
          </div>
        )}
        {landed && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2">
            <ParticleBurst
              burstKey={`final-${result?.score ?? 0}`}
              colors={[color, ambientColor, `${color}cc`, "#ffffff"]}
              count={Math.round(130 + dramaIntensity * 90)}
              speedMultiplier={1.25 + dramaIntensity * 0.35}
            />
          </div>
        )}

        {/* The previous tier's icon, kept mounted just long enough to
            shrink and fade away underneath the new one — a genuine
            crossfade instead of the old icon vanishing the instant the
            new one appears (which is what a plain key-remount gives you
            on its own). */}
        {OutgoingIcon && outgoingTier && (
          <div className="tier-icon-fade-out absolute inset-0 flex items-center justify-center">
            <OutgoingIcon
              className="h-full w-full"
              style={{
                filter: `brightness(1.3) contrast(1.15) saturate(1.25) drop-shadow(0 0 22px ${RANK_TEXT_COLORS[outgoingTier]}99)`,
              }}
            />
          </div>
        )}

        <div
          key={`ring-${levelUpKey}`}
          className={`flex h-full w-full items-center justify-center ${
            landed ? "reveal-materialize" : isDowngrade ? "tier-correction-glitch" : "tier-levelup-icon-pop"
          }`}
        >
          {/* The source art itself reads a little flat against all the
              motion around it — brightness/contrast/saturation plus a
              colored glow (matching this tier's own color) makes it pop
              the way the animated ring around it always has. A slow
              pulse during the anticipation hold, or a slow idle tilt
              once truly settled — applied here rather than on the
              wrapper above so neither can collide with (and
              accidentally restart) that wrapper's own level-up/
              materialize animation. */}
          <Icon
            className={`h-full w-full ${
              stage === "anticipating" ? "reveal-anticipation-pulse" : stage === "settled" ? "reveal-icon-idle-tilt" : ""
            }`}
            style={{
              filter: `brightness(1.3) contrast(1.15) saturate(1.25) drop-shadow(0 0 22px ${color}99)`,
            }}
          />
          {/* A light sweep across the emblem itself (not just the ring
              around it) — masked to this tier's own icon, using its
              alpha channel, so the highlight only ever paints over the
              badge's actual silhouette. */}
          <span
            aria-hidden
            className="icon-sweep-highlight pointer-events-none absolute inset-0"
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
        </div>

        {/* Shockwave ring on every tier crossing, key-remounted so the
            one-shot CSS animation replays each time. Skipped for a
            downgrade — a correction settling quietly, not another
            impact. */}
        {!isDowngrade && (
          <span
            key={`pulse-${levelUpKey}`}
            aria-hidden
            className="tier-levelup-ring pointer-events-none absolute inset-0 rounded-full border-2"
            style={{ borderColor: color }}
          />
        )}

        {stage === "landed" && (
          <span aria-hidden className="reveal-flash absolute inset-0 rounded-full bg-white" />
        )}
      </div>

      <div className="relative mt-7 flex flex-col items-center gap-1 text-center">
        {!landed && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
            {stage === "correcting" ? "Recalculating…" : "Rating your build…"}
          </p>
        )}
        {landed && result && (
          <p className="reveal-text-in text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            {result.isMock ? "Preview rating" : "Your rating"}
          </p>
        )}
        <p className="text-3xl font-bold tracking-tight transition-colors duration-300 ease-out" style={{ color }}>
          {RANK_LABELS[displayedTier]}
        </p>
        <p className="text-xl font-semibold tabular-nums text-white/90">{displayedValue.toFixed(2)}</p>
      </div>

      {/* The reveal used to hand off straight to the tier + score, with
          the actual "why" living only on the garage card afterward —
          landing the number and then saying nothing about it undersells
          the moment. Same copy the garage card already shows, just
          surfaced here first. */}
      {stage === "settled" && result && (
        <div className="reveal-text-in relative mt-5 max-w-xs px-6 text-center">
          <p className="text-sm leading-relaxed text-white/80">{result.strengths}</p>
          <p className="mt-2 text-sm leading-relaxed text-white/45">{result.limitingFactors}</p>
        </div>
      )}

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
          className="reveal-text-in relative mt-10 rounded-full px-8 py-3 text-sm font-semibold"
          style={{ backgroundColor: color, color: "#0a0a0b" }}
        >
          Continue
        </button>
      )}
    </div>
  );
}
