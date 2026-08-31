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
 * negative), regardless of where the unknown-phase climb happened to
 * be sitting when the real result arrived. Without this, a build that
 * scores low (say, bronze) could have already climbed well past that
 * number during the unknown phase and would have to visibly count
 * *down* into the real score — which reads as a mistake, not a
 * landing. This guarantees the final approach always climbs upward
 * into the exact number, never backward. */
export function landingStartValue(currentValue: number, target: number, runway: number): number {
  return Math.max(0, Math.min(currentValue, target - runway));
}
