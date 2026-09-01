/**
 * Pure math behind the rating reveal's climbing score — kept separate
 * from the component's stateful RAF loop so the actual curve shapes are
 * unit-testable without mounting anything.
 */

// While the real score is still unknown, the displayed number creeps
// toward this ceiling and never quite reaches it — climbing forever
// without spoiling anything, for however long the real API call takes.
const UNKNOWN_CLIMB_ASYMPTOTE = 92;
const UNKNOWN_CLIMB_TIME_CONSTANT_MS = 4200;

/** Exponential approach toward (never reaching) UNKNOWN_CLIMB_ASYMPTOTE —
 * fast at first, slowing continuously, the same "still climbing, not
 * done yet" feeling for as long as it needs to run. */
export function unknownClimbValue(elapsedMs: number): number {
  return UNKNOWN_CLIMB_ASYMPTOTE * (1 - Math.exp(-Math.max(0, elapsedMs) / UNKNOWN_CLIMB_TIME_CONSTANT_MS));
}

// Cubic rather than expo — expo's deceleration is nearly instantaneous
// in its final few percent, which reads as a snap rather than a glide.
// Cubic eases off the same "decelerating into place" way but over a
// visibly longer stretch of the animation, which is what actually
// makes the landing feel smooth rather than abrupt.
function easeOutCubic(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);
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
