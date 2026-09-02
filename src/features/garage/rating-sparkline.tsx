import { computeSparklinePoints } from "@/lib/rating/sparkline";

const WIDTH = 280;
const HEIGHT = 56;

/** Only meaningful with 2+ points — a single rating has nothing to
 * chart, which callers should check before rendering this at all. */
export function RatingSparkline({ scores }: { scores: number[] }) {
  const points = computeSparklinePoints(scores, WIDTH, HEIGHT, 4);
  const path = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-14 w-full text-accent" aria-hidden="true">
      <polyline
        points={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 3 : 2} fill="currentColor" />
      ))}
    </svg>
  );
}
