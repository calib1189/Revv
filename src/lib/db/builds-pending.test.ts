import { describe, expect, it } from "vitest";
import { pendingRatingFromBuild } from "./builds";

const full = {
  ai_rating_pending_score: 74.25,
  ai_rating_pending_strengths: "Clean stance.",
  ai_rating_pending_limiting_factors: "Stock interior.",
  ai_rating_pending_subscores: { appearance: 80, performance: 70, wheelsFitment: 75, interior: 60, modifications: 72 },
  ai_rating_pending_is_mock: false,
};

describe("pendingRatingFromBuild", () => {
  it("returns the unsaved rating held on the build", () => {
    expect(pendingRatingFromBuild(full)).toEqual({
      score: 74.25,
      strengths: "Clean stance.",
      limitingFactors: "Stock interior.",
      subscores: full.ai_rating_pending_subscores,
      isMock: false,
    });
  });

  it("returns null when nothing is pending or a part is missing", () => {
    expect(pendingRatingFromBuild({ ...full, ai_rating_pending_score: null })).toBeNull();
    expect(pendingRatingFromBuild({ ...full, ai_rating_pending_subscores: null })).toBeNull();
  });

  it("treats a missing mock flag as a real rating", () => {
    expect(pendingRatingFromBuild({ ...full, ai_rating_pending_is_mock: null })?.isMock).toBe(false);
  });
});
