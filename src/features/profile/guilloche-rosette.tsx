"use client";

import { useMemo, useSyncExternalStore } from "react";

/** Drawn in a 300×300 box; callers size it with CSS. */
const SIZE = 300;
const CENTER = SIZE / 2;

interface Band {
  radius: number;
  amplitude: number;
  lobes: number;
  curves: number;
}

/** Two bands of phase-shifted sine rings — the engraved lattice on a
 * banknote or passport page. Their radii overlap by about 8px, and they
 * turn in opposite directions, which is where the slow moiré comes from. */
const INNER_BAND: Band = { radius: 100, amplitude: 18, lobes: 12, curves: 9 };
const OUTER_BAND: Band = { radius: 125, amplitude: 13, lobes: 21, curves: 7 };
/** Points per lobe — enough that the polyline reads as a curve at 300px. */
const STEPS_PER_LOBE = 28;

function bandPaths(band: Band): string[] {
  const steps = band.lobes * STEPS_PER_LOBE;
  const paths: string[] = [];
  for (let k = 0; k < band.curves; k++) {
    const phase = (k / band.curves) * Math.PI * 2;
    let d = "";
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const r = band.radius + band.amplitude * Math.sin(band.lobes * t + phase);
      d += `${i === 0 ? "M" : "L"}${(CENTER + r * Math.cos(t)).toFixed(2)} ${(CENTER + r * Math.sin(t)).toFixed(2)}`;
    }
    paths.push(`${d}Z`);
  }
  return paths;
}

const subscribeNothing = () => () => {};

/** Fades the lattice out toward the avatar in the middle and toward the
 * page at the rim, so it never reads as a hard-edged ring. */
const RING_MASK =
  "radial-gradient(closest-side, transparent 47%, #000 57%, #000 82%, transparent 100%)";

/** The security-print rosette behind the large seal in the verified
 * sheet (verified-credential.tsx), drawn in the verified blue so it reads
 * as part of the seal, not as a cosmetic. Decorative only (aria-hidden,
 * no pointer events).
 *
 * Client-only on purpose: a few thousand points of path data would bloat
 * the server HTML, and Math.sin isn't guaranteed bit-identical between
 * Node and the browser, so rendering it on both sides risks a hydration
 * mismatch. Before hydration it renders nothing, which is the same as
 * the page without it. */
export function GuillocheRosette({
  className = "",
  engrave = true,
}: {
  className?: string;
  /** Draw each curve in along its length on arrival. */
  engrave?: boolean;
}) {
  const isClient = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const bands = useMemo(
    () => (isClient ? [bandPaths(INNER_BAND), bandPaths(OUTER_BAND)] : null),
    [isClient],
  );
  if (!bands) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none ${className}`}
      style={{ maskImage: RING_MASK, WebkitMaskImage: RING_MASK }}
    >
      {bands.map((paths, bandIndex) => (
        <div
          key={bandIndex}
          className={`absolute inset-0 ${bandIndex === 0 ? "animate-rosette-turn" : "animate-rosette-turn-reverse"}`}
        >
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="h-full w-full"
            fill="none"
            stroke="var(--verified)"
            strokeWidth={0.6}
            strokeOpacity={bandIndex === 0 ? 0.6 : 0.45}
          >
            {paths.map((d, i) => (
              <path
                key={i}
                d={d}
                pathLength={1}
                vectorEffect="non-scaling-stroke"
                className={engrave ? "animate-rosette-engrave" : undefined}
                style={engrave ? { animationDelay: `${bandIndex * 260 + i * 70}ms` } : undefined}
              />
            ))}
          </svg>
        </div>
      ))}
    </div>
  );
}
