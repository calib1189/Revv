import { describe, expect, it } from "vitest";
import { computeEngagementScore, computeHotScore, NO_AFFINITY, type PostEngagementSignals } from "./feed-score";

function signals(overrides: Partial<PostEngagementSignals> = {}): PostEngagementSignals {
  return {
    views: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    completions: 0,
    ageHours: 0,
    ...overrides,
  };
}

describe("computeEngagementScore", () => {
  it("gives a brand-new, zero-engagement post a small positive baseline, not zero", () => {
    expect(computeEngagementScore(signals())).toBeGreaterThan(0);
  });

  it("weighs a like more than a view", () => {
    const withView = computeEngagementScore(signals({ views: 1 }));
    const withLike = computeEngagementScore(signals({ likes: 1 }));
    expect(withLike).toBeGreaterThan(withView);
  });

  it("weighs a share more than a like, comment, or save", () => {
    const withShare = computeEngagementScore(signals({ shares: 1 }));
    expect(withShare).toBeGreaterThan(computeEngagementScore(signals({ likes: 1 })));
    expect(withShare).toBeGreaterThan(computeEngagementScore(signals({ comments: 1 })));
    expect(withShare).toBeGreaterThan(computeEngagementScore(signals({ saves: 1 })));
  });

  it("weighs a watched-to-completion more than a plain view", () => {
    const withCompletion = computeEngagementScore(signals({ completions: 1 }));
    const withView = computeEngagementScore(signals({ views: 1 }));
    expect(withCompletion).toBeGreaterThan(withView);
  });

  it("is exactly the documented weighted sum plus the freshness baseline", () => {
    const s = signals({ views: 100, likes: 25, comments: 3, saves: 4, shares: 2, completions: 10 });
    // BASE_FRESHNESS(2) + 100*1 + 25*5 + 3*8 + 4*6 + 2*12 + 10*4
    expect(computeEngagementScore(s)).toBe(2 + 100 + 125 + 24 + 24 + 24 + 40);
  });
});

describe("computeHotScore", () => {
  it("the exact scenario the feature was requested for: same views, more likes ranks higher at equal age", () => {
    const moreLikes = computeHotScore(signals({ views: 100, likes: 25, ageHours: 5 }));
    const fewerLikes = computeHotScore(signals({ views: 100, likes: 2, ageHours: 5 }));
    expect(moreLikes).toBeGreaterThan(fewerLikes);
  });

  it("decays with age — identical engagement scores lower the older the post is", () => {
    const fresh = computeHotScore(signals({ likes: 10, ageHours: 1 }));
    const older = computeHotScore(signals({ likes: 10, ageHours: 48 }));
    expect(fresh).toBeGreaterThan(older);
  });

  it("never inverts decay into a boost for a negative age (clock skew safety)", () => {
    const negative = computeHotScore(signals({ likes: 10, ageHours: -5 }));
    const zero = computeHotScore(signals({ likes: 10, ageHours: 0 }));
    expect(negative).toBe(zero);
  });

  it("a category affinity match strictly increases the score", () => {
    const base = computeHotScore(signals({ likes: 10, ageHours: 2 }), NO_AFFINITY);
    const boosted = computeHotScore(signals({ likes: 10, ageHours: 2 }), {
      matchesCategory: true,
      matchesMake: false,
    });
    expect(boosted).toBeGreaterThan(base);
  });

  it("a make affinity match strictly increases the score, independent of category", () => {
    const base = computeHotScore(signals({ likes: 10, ageHours: 2 }), NO_AFFINITY);
    const boosted = computeHotScore(signals({ likes: 10, ageHours: 2 }), {
      matchesCategory: false,
      matchesMake: true,
    });
    expect(boosted).toBeGreaterThan(base);
  });

  it("category and make affinity stack rather than one overriding the other", () => {
    const categoryOnly = computeHotScore(signals({ likes: 10, ageHours: 2 }), {
      matchesCategory: true,
      matchesMake: false,
    });
    const both = computeHotScore(signals({ likes: 10, ageHours: 2 }), {
      matchesCategory: true,
      matchesMake: true,
    });
    expect(both).toBeGreaterThan(categoryOnly);
  });

  it("a wildly popular old post can still outrank a fresh, unengaged one", () => {
    const viral = computeHotScore(signals({ likes: 5000, comments: 800, shares: 300, ageHours: 72 }));
    const freshEmpty = computeHotScore(signals({ ageHours: 0 }));
    expect(viral).toBeGreaterThan(freshEmpty);
  });
});
