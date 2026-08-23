function formatTenths(tenths: number): string {
  const whole = Math.floor(tenths / 10);
  const frac = tenths % 10;
  return frac === 0 ? `${whole}` : `${whole}.${frac}`;
}

/** Formats a count the way social feeds do: 950, 1.2K, 3.4M.
 *
 * Avoids `toFixed` on a divided value — e.g. (9950 / 1000).toFixed(1) is
 * "9.9" not "10.0" because 9.95 isn't exactly representable in binary
 * floating point. Rounding to an integer "tenths" count first sidesteps
 * that entirely. */
export function formatCompactNumber(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) {
    if (value < 10_000) return `${formatTenths(Math.round(value / 100))}K`;
    return `${Math.round(value / 1000)}K`;
  }
  if (value < 10_000_000) return `${formatTenths(Math.round(value / 100_000))}M`;
  return `${Math.round(value / 1_000_000)}M`;
}
