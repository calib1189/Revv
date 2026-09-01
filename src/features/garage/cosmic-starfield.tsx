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

export function CosmicStarfield() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
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
    </div>
  );
}
