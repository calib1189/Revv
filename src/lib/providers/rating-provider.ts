export interface BuildRatingSubscores {
  /** All 0-100. Sum/average has no special meaning — each is the AI's
   * independent read of that one facet, not a weighted component of
   * `score` (the headline score is its own holistic judgment call, not
   * derived from these). */
  style: number;
  execution: number;
  mods: number;
  photography: number;
}

export interface BuildRating {
  /** 0-100, two decimal places. */
  score: number;
  /** What earned the score — specific things observed, 1-2 sentences. */
  strengths: string;
  /** What's specifically holding it back from a higher score, 1-2 sentences. */
  limitingFactors: string;
  subscores: BuildRatingSubscores;
  isMock: boolean;
}

export interface RatingPhoto {
  bytes: ArrayBuffer;
  mimeType: string;
}

export interface RatingProvider {
  /** `buildSummary` is a plain-text description of the vehicle and its
   * modifications assembled by the caller — the provider never reaches
   * into the database itself. */
  rateBuild(photos: RatingPhoto[], buildSummary: string): Promise<BuildRating>;
}
