export interface SparklinePoint {
  x: number;
  y: number;
}

/** Maps a series of scores onto an SVG viewbox's coordinate space —
 * evenly spaced on x, scaled to the series' own min/max on y (not a
 * fixed 0-100 scale, so a build hovering in the 80s doesn't render as a
 * near-flat line pinned to the top of the chart). SVG y grows downward,
 * so the highest score gets the smallest y. A single point centers in
 * the box; the caller decides whether a 1-point series is worth
 * drawing at all. */
export function computeSparklinePoints(
  scores: number[],
  width: number,
  height: number,
  padding = 4,
): SparklinePoint[] {
  if (scores.length === 0) return [];
  if (scores.length === 1) return [{ x: width / 2, y: height / 2 }];

  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;

  return scores.map((score, i) => ({
    x: padding + (i / (scores.length - 1)) * (width - padding * 2),
    y: height - padding - ((score - min) / range) * (height - padding * 2),
  }));
}
