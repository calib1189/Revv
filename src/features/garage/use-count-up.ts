import { useEffect, useState } from "react";

/** Eases toward 1 fast at first, then settles in slowly — the classic
 * "spinning number that clicks into place" feel, rather than a linear
 * count that looks robotic. */
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** Animates a number from `from` up to `target` over `durationMs`, only
 * while `active` is true — used for the rating reveal's final count-up.
 * Starting from `from` (not always 0) matters here specifically: the
 * climb already displays the landed tier's own minimum score right up
 * until landing, and starting the count-up at 0 instead would jump the
 * number backwards for an instant before counting back up past where
 * it already was — `from` lets the count-up continue upward from
 * exactly that point instead. Restarts every time `target` changes
 * while active, since a re-rate producing a new score should count up
 * again, not jump. */
export function useCountUp(target: number, durationMs: number, active: boolean, from = 0): number {
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (!active) {
      // Deferred rather than called synchronously in the effect body —
      // avoids the cascading-render footgun React's stricter effect
      // rules now flag, with no visible behavior change since a 0ms
      // timeout still resolves before the next paint.
      const reset = setTimeout(() => setValue(from), 0);
      return () => clearTimeout(reset);
    }
    let raf: number;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      setValue(from + (target - from) * easeOutExpo(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, active, from]);

  return value;
}
