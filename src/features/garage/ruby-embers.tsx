/** Ruby-only backdrop for the build-rating reveal's final landing —
 * same idea as CosmicStarfield/EmeraldAura/DiamondPrism, themed to
 * ruby: rising embers over a slow-pulsing heat glow, like the inside of
 * a forge rather than a flat red wash. Pure CSS, generated once at
 * module load since it's decorative and never needs to change after
 * that. */

interface Ember {
  left: number;
  duration: number;
  delay: number;
  size: number;
  driftX: number;
}

function generateEmbers(count: number): Ember[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    duration: 3.5 + Math.random() * 3,
    delay: Math.random() * 5,
    size: 2 + Math.random() * 4,
    driftX: (Math.random() - 0.5) * 50,
  }));
}

const EMBERS = generateEmbers(30);

export function RubyEmbers() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* A slow-pulsing heat glow underneath the embers — the forge
          they're rising out of, not just a static backdrop. */}
      <div className="reveal-heat-pulse absolute inset-0" />

      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="reveal-firefly-rise absolute rounded-full"
          style={{
            left: `${e.left}%`,
            bottom: "-5%",
            width: e.size,
            height: e.size,
            background: "#ffb199",
            boxShadow: "0 0 8px 2px rgba(255, 90, 60, 0.85)",
            animationDuration: `${e.duration}s`,
            animationDelay: `${e.delay}s`,
            "--drift-x": `${e.driftX}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
