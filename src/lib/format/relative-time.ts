const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

const formatter = new Intl.RelativeTimeFormat("en", { style: "narrow" });

export function relativeTime(isoDate: string, now: Date = new Date()): string {
  const diffSeconds = Math.round(
    (new Date(isoDate).getTime() - now.getTime()) / 1000,
  );
  const abs = Math.abs(diffSeconds);

  if (abs < 60) return "now";

  for (const [unit, secondsInUnit] of UNITS) {
    if (abs >= secondsInUnit) {
      const value = Math.round(diffSeconds / secondsInUnit);
      return formatter.format(value, unit);
    }
  }
  return "now";
}
