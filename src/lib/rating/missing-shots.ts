export type MissingShot = "engine bay" | "interior";

// A sentence has to be about photos for a subject in it to count: "a lack
// of clear engine bay shots" is, "the engine bay could use more detailed
// showcase elements" is advice about the build itself.
const PHOTO_CUES = /\b(shots?|photos?|pictures?|images?|visible|unseen|seen)\b/i;
const SUBJECTS: [MissingShot, RegExp][] = [
  ["engine bay", /\bengine bay\b/i],
  ["interior", /\b(interior|cabin)\b/i],
];

/**
 * Parts of the car the AI said it couldn't see, read from its "what's
 * holding it back" text. Deterministic and conservative: nothing is
 * stored, it only decides whether to prompt the owner to add a photo.
 */
export function missingShots(limitingFactors: string | null): MissingShot[] {
  if (!limitingFactors) return [];
  const found = new Set<MissingShot>();
  for (const sentence of limitingFactors.split(/(?<=[.!?])\s+/)) {
    if (!PHOTO_CUES.test(sentence)) continue;
    for (const [shot, pattern] of SUBJECTS) if (pattern.test(sentence)) found.add(shot);
  }
  return SUBJECTS.map(([shot]) => shot).filter((shot) => found.has(shot));
}

export function describeMissingShots(shots: MissingShot[]): string {
  return shots.join(" or ");
}
