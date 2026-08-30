import { useEffect, useState } from "react";

/** Eases toward 1 fast at first, then settles in slowly — the classic
 * "spinning number that clicks into place" feel, rather than a linear
 * count that looks robotic. */
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** Animates a number from 0 up to `target` over `durationMs`, only while
 * `active` is true — used for the score reveal's count-up. Restarts
 * from 0 every time `target` changes while active, since a re-rate
 * producing a new score should count up again, not jump. */
export function useCountUp(target: number, durationMs: number, active: boolean): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      // Deferred rather than called synchronously in the effect body —
      // avoids the cascading-render footgun React's stricter effect
      // rules now flag, with no visible behavior change since a 0ms
      // timeout still resolves before the next paint.
      const reset = setTimeout(() => setValue(0), 0);
      return () => clearTimeout(reset);
    }
    let raf: number;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      setValue(target * easeOutExpo(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, active]);

  return value;
}
