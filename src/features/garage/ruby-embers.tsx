/** Ruby-only backdrop for the build-rating reveal's final landing —
 * same idea as CosmicStarfield/EmeraldAura/DiamondPrism, themed to
 * ruby: a rotating flame-vortex sweep and a slow-pulsing heat glow,
 * with embers rising through both — the inside of a forge, not a flat
 * red wash. Ruby sits right below cosmic on the ladder and asked for
 * "insane cinematic" specifically, so this carries as many active
 * layers as diamond's sweep + cosmic's stars/planets, not just embers
 * alone. Pure CSS, generated once at module load since it's decorative
 * and never needs to change after that. */

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

const EMBERS = generateEmbers(38);

export function RubyEmbers() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* A rotating flame-vortex sweep — same technique as diamond's
          prism sweep, warm tones instead of cold. */}
      <div className="reveal-flame-vortex absolute inset-0" />
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
