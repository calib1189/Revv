import { RANK_TIERS } from "@/lib/rating/rank";

/**
 * Pure math behind the rating reveal's climbing score — kept separate
 * from the component's stateful RAF loop so the actual curve shapes are
 * unit-testable without mounting anything.
 */

// Cubic rather than expo — expo's deceleration is nearly instantaneous
// in its final few percent, which reads as a snap rather than a glide.
// Cubic eases off the same "decelerating into place" way but over a
// visibly longer stretch of the animation, which is what actually
// makes the landing feel smooth rather than abrupt.
function easeOutCubic(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);
}

function linear(t: number): number {
  return t;
}

// The unknown-phase climb is a deliberately hand-tuned schedule, not
// one smooth curve — bronze through gold fly by (a flat linear ramp,
// so no single one of them drags), then platinum/emerald ease off
// slightly, then diamond and ruby each get their own segment sized to
// land in a specific dwell window (~500-700ms and ~700-1000ms) so a
// viewer actually registers reaching them, rather than everything
// decelerating smoothly toward one asymptote (which spent most of its
// time crawling through the 60s and almost never visibly reached
// diamond or ruby before the real result arrived — see MIN_CLIMB_MS's
// own history in rating-reveal.tsx). Total time to reach the last
// checkpoint is unchanged from the original design (6200ms).
const CLIMB_SEGMENTS: { untilMs: number; toValue: number; ease: (t: number) => number }[] = [
  { untilMs: 3800, toValue: 60, ease: linear }, // bronze -> gold, fast throughout
  { untilMs: 4250, toValue: 70, ease: easeOutCubic }, // platinum, slows slightly
  { untilMs: 4750, toValue: 80, ease: easeOutCubic }, // emerald, slows slightly
  { untilMs: 5350, toValue: 90, ease: easeOutCubic }, // diamond, ~600ms dwell
];
// Ruby's own dwell runs from the last segment's end (5350ms) to
// MIN_CLIMB_MS (6200ms) in rating-reveal.tsx — ~850ms, inside its
// 700-1000ms target — creeping the rest of the way from 90 toward this
// ceiling. Kept at the original design's own asymptote value so a
// climb that runs long (a slow real API call) still never reaches or
// exceeds it, same guarantee as before.
const TAIL_CEILING = 92;
const TAIL_TIME_CONSTANT_MS = 3000;

/** The unknown-phase climb's value at `elapsedMs` — see CLIMB_SEGMENTS
 * for the actual per-tier pacing this produces. */
export function unknownClimbValue(elapsedMs: number): number {
  const t = Math.max(0, elapsedMs);
  let segStart = 0;
  let valueStart = 0;
  for (const seg of CLIMB_SEGMENTS) {
    if (t <= seg.untilMs) {
      const frac = (t - segStart) / (seg.untilMs - segStart);
      return valueStart + (seg.toValue - valueStart) * seg.ease(frac);
    }
    segStart = seg.untilMs;
    valueStart = seg.toValue;
  }
  // Past the last checkpoint (ruby's own window and beyond, if the real
  // result takes longer than MIN_CLIMB_MS to arrive) — the same
  // "creep toward a ceiling, never reach it" shape the whole original
  // design used, just re-anchored to start from here instead of 0.
  return (
    valueStart + (TAIL_CEILING - valueStart) * (1 - Math.exp(-(t - segStart) / TAIL_TIME_CONSTANT_MS))
  );
}

/** The highest value the unknown-phase climb is allowed to show once the
 * real score is already known but the climb hasn't reached its minimum
 * suspense duration yet — one tier above the real score's own tier, no
 * further. Without this, the climb keeps racing toward its own ~92
 * ceiling regardless of how low the real score actually is, and
 * whatever tier it happens to be sitting in once the minimum duration
 * expires becomes the peak the "correcting" stage has to visibly crash
 * back down from — a real score of, say, Gold could let the climb touch
 * Ruby first, then correction has to plunge through Diamond, Emerald,
 * and Platinum on its way back down. Capping the peak at one tier above
 * the truth means a correction never has to cross more than that one
 * tier boundary, however far below the peak the real score is. Returns
 * `Infinity` (no cap) once the real score is already ruby or cosmic —
 * there's no tier above cosmic to cap against, and the climb's own
 * asymptote never gets that high anyway. */
export function climbCeilingForScore(trueScore: number): number {
  const trueIndex = RANK_TIERS.findIndex((t) => trueScore >= t.min);
  const capIndex = Math.max(0, trueIndex - 1);
  if (capIndex === 0) return Infinity;
  return RANK_TIERS[capIndex - 1].min - 0.01;
}

/** Interpolates from `from` to `to` over `durationMs`, eased so it lands
 * with a decelerating "click into place" rather than a linear count. */
export function landingValue(elapsedMs: number, durationMs: number, from: number, to: number): number {
  const t = Math.min(1, Math.max(0, elapsedMs) / durationMs);
  return from + (to - from) * easeOutCubic(t);
}

/** Where the final landing animation should start from — always at
 * least `runway` points below the real target (clamped to never go
 * negative). When `currentValue` is already at or below that point,
 * this returns `currentValue` itself unchanged, so the final approach
 * never visibly moves backward from wherever the number is already
 * sitting. When `currentValue` sits *above* `target - runway` (the
 * unknown-phase climb went further than the real score needs, or the
 * real score is a genuine overshoot past the target — see
 * needsCorrection below), the caller is expected to run an explicit,
 * visible correction down to this value first — see
 * rating-reveal.tsx's "correcting" stage — rather than jumping straight
 * here, which is what silently produces the "score drops when the rank
 * changes" glitch. */
export function landingStartValue(currentValue: number, target: number, runway: number): number {
  const runwayStart = Math.max(0, target - runway);
  return Math.min(currentValue, runwayStart);
}

/** True when `currentValue` sits far enough above `target` that landing
 * can't simply climb upward into it without first visibly correcting
 * downward — the exact condition that produces an unexplained score
 * drop if it isn't handled as its own explicit animated stage first. */
export function needsCorrection(currentValue: number, target: number, runway: number): boolean {
  return currentValue > Math.max(0, target - runway);
}
