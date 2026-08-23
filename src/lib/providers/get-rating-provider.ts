import type { RatingProvider } from "./rating-provider";
import { MockRatingProvider } from "./mock-rating-provider";
import { GeminiRatingProvider } from "./gemini-rating-provider";

/**
 * Real provider when GEMINI_API_KEY is configured, mock otherwise — same
 * pattern as get-vision-provider and get-chat-provider.
 */
export function getRatingProvider(): RatingProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiRatingProvider(apiKey);
  return new MockRatingProvider();
}
