// Deterministic arithmetic only — no LLM anywhere in this file. Every
// function either returns a real computed value or "insufficient data";
// it never guesses.

export interface TireSize {
  /** Section width in mm, e.g. 245 in "245/40R18". */
  widthMm: number;
  /** Aspect ratio as a percent, e.g. 40 in "245/40R18". */
  aspectRatio: number;
  /** Rim diameter in inches, e.g. 18 in "245/40R18". */
  rimDiameterInches: number;
}

const MM_PER_INCH = 25.4;

export function calculateBackspacingInches(
  wheelWidthInches: number,
  offsetMm: number,
): number {
  return wheelWidthInches / 2 + offsetMm / MM_PER_INCH;
}

export function calculateTireDiameterInches(tire: TireSize): number {
  const sidewallHeightMm = tire.widthMm * (tire.aspectRatio / 100);
  const sidewallHeightInches = sidewallHeightMm / MM_PER_INCH;
  return tire.rimDiameterInches + 2 * sidewallHeightInches;
}

export function tireDiameterDeltaPercent(
  current: TireSize,
  proposed: TireSize,
): number {
  const currentDiameter = calculateTireDiameterInches(current);
  const proposedDiameter = calculateTireDiameterInches(proposed);
  return ((proposedDiameter - currentDiameter) / currentDiameter) * 100;
}

export interface BoltPattern {
  holes: number;
  diameterMm: number;
}

/** Parses "5x114.3" style strings. Returns null for anything else — this
 * is the "insufficient data" signal, not a guess. */
export function parseBoltPattern(pattern: string): BoltPattern | null {
  const match = /^\s*(\d+)\s*[xX]\s*(\d+(?:\.\d+)?)\s*$/.exec(pattern);
  if (!match) return null;

  const holes = Number(match[1]);
  const diameterMm = Number(match[2]);
  if (holes < 3 || holes > 10 || diameterMm <= 0) return null;

  return { holes, diameterMm };
}

/**
 * Returns null (insufficient/unparseable data) rather than guessing when
 * either pattern can't be parsed.
 */
export function boltPatternsMatch(a: string, b: string): boolean | null {
  const patternA = parseBoltPattern(a);
  const patternB = parseBoltPattern(b);
  if (!patternA || !patternB) return null;

  return (
    patternA.holes === patternB.holes &&
    Math.abs(patternA.diameterMm - patternB.diameterMm) < 0.5
  );
}
