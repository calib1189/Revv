export interface BuildRating {
  /** 0-100, two decimal places. */
  score: number;
  /** What earned the score — specific things observed, 1-2 sentences. */
  strengths: string;
  /** What's specifically holding it back from a higher score, 1-2 sentences. */
  limitingFactors: string;
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
