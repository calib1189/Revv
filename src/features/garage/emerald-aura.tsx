/** Emerald-only backdrop for the build-rating reveal's final landing —
 * same "one bespoke moment, not just a bigger version of every other
 * tier" idea as CosmicStarfield, themed to emerald instead: drifting
 * firefly-like motes rising through soft vertical light shafts, like
 * sunlight through a forest canopy. Pure CSS, generated once at module
 * load since it's decorative and never needs to change after that. */

interface Firefly {
  left: number;
  duration: number;
  delay: number;
  size: number;
  driftX: number;
}

function generateFireflies(count: number): Firefly[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    duration: 5 + Math.random() * 4,
    delay: Math.random() * 6,
    size: 3 + Math.random() * 4,
    driftX: (Math.random() - 0.5) * 60,
  }));
}

const FIREFLIES = generateFireflies(26);

export function EmeraldAura() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Soft vertical light shafts, like sunlight breaking through a
          canopy — a few wide, faint, slowly-shifting gradient bars. */}
      <div className="reveal-emerald-shafts absolute inset-0" />

      {FIREFLIES.map((f, i) => (
        <span
          key={i}
          className="reveal-firefly-rise absolute rounded-full bg-emerald-300"
          style={{
            left: `${f.left}%`,
            bottom: "-5%",
            width: f.size,
            height: f.size,
            boxShadow: "0 0 6px 2px rgba(94, 234, 212, 0.8)",
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            "--drift-x": `${f.driftX}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
