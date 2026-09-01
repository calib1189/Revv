/** Cosmic-only backdrop for the build-rating reveal's final landing —
 * the single tier the feedback that shaped this component specifically
 * called out for its own bespoke treatment ("the entire screen turning
 * into a galaxy, with stars in the back and planets animated"), rather
 * than just a bigger version of every other tier's effects. Pure CSS
 * (the box-shadow-per-star trick), generated once at module load since
 * it's decorative and never needs to change after that — no canvas, no
 * per-frame JS, unlike ParticleBurst which actually needs to simulate
 * motion. */

function generateStars(count: number): string {
  const stars: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = (Math.random() * 100).toFixed(2);
    const y = (Math.random() * 100).toFixed(2);
    stars.push(`${x}vw ${y}vh 0 #fff`);
  }
  return stars.join(", ");
}

// Three depths — more, smaller, dimmer stars further back; fewer,
// bigger, brighter ones up front — each with its own twinkle timing so
// they don't all pulse in lockstep.
const STAR_LAYERS = [
  { boxShadow: generateStars(90), size: 1, opacity: 0.5, duration: "3.4s" },
  { boxShadow: generateStars(55), size: 2, opacity: 0.75, duration: "2.6s" },
  { boxShadow: generateStars(28), size: 3, opacity: 1, duration: "4.2s" },
];

// Real shooting stars are rare and don't all streak on the same beat —
// each one only actually moves during a small slice of its own long
// cycle (see the keyframe's 0-6% window), staggered by delay and cycle
// length so they read as occasional, not a synchronized barrage.
const SHOOTING_STARS = [
  { top: 8, left: 15, angle: 25, duration: "7s", delay: "0.5s" },
  { top: 18, left: 65, angle: 20, duration: "9s", delay: "3.2s" },
  { top: 4, left: 45, angle: 30, duration: "11s", delay: "6.4s" },
  { top: 28, left: 80, angle: 18, duration: "8s", delay: "1.8s" },
];

export function CosmicStarfield() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Cosmic sits at the very top of the ladder, so it carries the
          most layers of anything here: a rotating nebula swirl underneath
          the stars and planets, not just the two effects every other
          bespoke tier gets. */}
      <div className="reveal-nebula-swirl absolute inset-0" />
      {STAR_LAYERS.map((layer, i) => (
        <div
          key={i}
          className="reveal-star-twinkle absolute left-0 top-0 rounded-full bg-white"
          style={{
            width: layer.size,
            height: layer.size,
            boxShadow: layer.boxShadow,
            opacity: layer.opacity,
            animationDuration: layer.duration,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
      <div className="reveal-planet-drift-a absolute h-40 w-40 rounded-full opacity-70 blur-2xl" style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)" }} />
      <div className="reveal-planet-drift-b absolute h-28 w-28 rounded-full opacity-60 blur-2xl" style={{ background: "radial-gradient(circle, #60a5fa 0%, transparent 70%)" }} />
      <div className="reveal-planet-drift-c absolute h-16 w-16 rounded-full opacity-50 blur-xl" style={{ background: "radial-gradient(circle, #f472b6 0%, transparent 70%)" }} />

      {/* Two nested elements, not one — the outer sets a fixed angle via
          `transform: rotate()`, the inner animates its own `transform`
          for the actual streak. One element can't do both: a CSS
          animation's `transform` keyframes fully replace whatever a
          plain inline `transform` style set, they don't compose with
          it, so the rotate would just get wiped out the moment the
          animation started. */}
      {SHOOTING_STARS.map((s, i) => (
        <span
          key={i}
          className="pointer-events-none absolute"
          style={{ top: `${s.top}%`, left: `${s.left}%`, transform: `rotate(${s.angle}deg)` }}
        >
          <span
            className="reveal-shooting-star-trail block"
            style={{ animationDuration: s.duration, animationDelay: s.delay }}
          />
        </span>
      ))}
    </div>
  );
}
