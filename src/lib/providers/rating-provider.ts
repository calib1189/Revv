export interface BuildRating {
  /** 0-10, one decimal. */
  score: number;
  /** Short rationale, 1-2 sentences. */
  summary: string;
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
