import { describe, expect, it } from "vitest";
import {
  REVIEW_PROMPT_COOLDOWN_MS,
  REVIEW_PROMPT_MIN_SCORE,
  shouldAskForReview,
} from "@/lib/native/app-review";

const NOW = 1_800_000_000_000;

describe("shouldAskForReview", () => {
  it("asks after a good score when never asked before", () => {
    expect(shouldAskForReview(66.61, null, NOW)).toBe(true);
  });

  it("asks right at the threshold", () => {
    expect(shouldAskForReview(REVIEW_PROMPT_MIN_SCORE, null, NOW)).toBe(true);
  });

  it("doesn't ask after a low score", () => {
    expect(shouldAskForReview(49.99, null, NOW)).toBe(false);
  });

  it("doesn't ask again inside the cooldown", () => {
    expect(shouldAskForReview(80, NOW - REVIEW_PROMPT_COOLDOWN_MS + 1, NOW)).toBe(false);
  });

  it("asks again once the cooldown has passed", () => {
    expect(shouldAskForReview(80, NOW - REVIEW_PROMPT_COOLDOWN_MS, NOW)).toBe(true);
  });
});
