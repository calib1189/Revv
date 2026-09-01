/** Diamond-only backdrop for the build-rating reveal's final landing —
 * same idea as CosmicStarfield/EmeraldAura, themed to diamond: a slow
 * rotating sweep of prismatic light (like light turning inside a cut
 * stone) plus a field of small, sharp, twinkling ice-white motes,
 * brighter and colder than cosmic's soft stars. Pure CSS, generated
 * once at module load since it's decorative and never needs to change
 * after that. */

function generateSparkles(count: number): string {
  const sparkles: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = (Math.random() * 100).toFixed(2);
    const y = (Math.random() * 100).toFixed(2);
    sparkles.push(`${x}vw ${y}vh 0 #e0f7ff`);
  }
  return sparkles.join(", ");
}

const SPARKLE_LAYERS = [
  { boxShadow: generateSparkles(40), size: 2, duration: "2.2s" },
  { boxShadow: generateSparkles(22), size: 3, duration: "1.7s" },
];

export function DiamondPrism() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* A slow-turning sweep of prismatic light — light passing through
          and refracting inside a cut stone, rather than a flat wash. */}
      <div className="reveal-prism-sweep absolute inset-0" />

      {SPARKLE_LAYERS.map((layer, i) => (
        <div
          key={i}
          className="reveal-star-twinkle absolute left-0 top-0 rounded-full bg-white"
          style={{
            width: layer.size,
            height: layer.size,
            boxShadow: layer.boxShadow,
            animationDuration: layer.duration,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}
