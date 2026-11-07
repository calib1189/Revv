/** Pure helpers for SORZA shop reviews (0102). The summary is always
 * computed from the review rows when a page is read, never stored. */

export const MAX_REVIEW_BODY = 1000;
export const MAX_REVIEW_SERVICE = 40;
export const MAX_OWNER_REPLY = 1000;

export type StarCount = 1 | 2 | 3 | 4 | 5;

export interface ReviewSummary {
  count: number;
  /** Rounded to one decimal; null when there are no reviews. */
  average: number | null;
  distribution: Record<StarCount, number>;
}

export function summarizeReviews(ratings: number[]): ReviewSummary {
  const distribution: Record<StarCount, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let count = 0;
  let total = 0;
  for (const rating of ratings) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) continue;
    distribution[rating as StarCount] += 1;
    count += 1;
    total += rating;
  }
  return {
    count,
    average: count === 0 ? null : Math.round((total / count) * 10) / 10,
    distribution,
  };
}

export interface ReviewInput {
  rating: number;
  service: string;
  body: string;
}

export type NormalizedReview =
  | { value: { rating: number; service: string | null; body: string | null } }
  | { error: string };

export function normalizeReviewInput(input: ReviewInput): NormalizedReview {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { error: "Tap a star rating." };
  }
  const service = input.service.trim().replace(/\s+/g, " ");
  if (service.length > MAX_REVIEW_SERVICE) {
    return { error: `Keep "what you got done" under ${MAX_REVIEW_SERVICE} characters.` };
  }
  const body = input.body.trim();
  if (body.length > MAX_REVIEW_BODY) {
    return { error: `Keep your review under ${MAX_REVIEW_BODY} characters.` };
  }
  return { value: { rating: input.rating, service: service || null, body: body || null } };
}
