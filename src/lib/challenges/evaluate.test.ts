import { describe, it, expect } from "vitest";
import { evaluateChallenges, type ChallengeStats } from "./evaluate";

function stats(overrides: Partial<ChallengeStats> = {}): ChallengeStats {
  return {
    postsThisWeek: 0,
    ratingAttemptsThisWeek: 0,
    likesReceivedThisWeek: 0,
    commentsMadeThisWeek: 0,
    ...overrides,
  };
}

function find(progress: ReturnType<typeof evaluateChallenges>, id: string) {
  return progress.find((p) => p.id === id)!;
}

describe("evaluateChallenges", () => {
  it("nothing is completed for a quiet week", () => {
    const progress = evaluateChallenges(stats());
    expect(progress.every((p) => !p.completed)).toBe(true);
  });

  it("marks post_3 completed only once 3 posts are made", () => {
    expect(find(evaluateChallenges(stats({ postsThisWeek: 2 })), "post_3").completed).toBe(false);
    expect(find(evaluateChallenges(stats({ postsThisWeek: 3 })), "post_3").completed).toBe(true);
  });

  it("clamps current to target rather than overshooting the progress bar", () => {
    const progress = find(evaluateChallenges(stats({ postsThisWeek: 9 })), "post_3");
    expect(progress.current).toBe(3);
    expect(progress.target).toBe(3);
    expect(progress.completed).toBe(true);
  });

  it("a single rating attempt completes rate_a_build", () => {
    expect(find(evaluateChallenges(stats({ ratingAttemptsThisWeek: 1 })), "rate_a_build").completed).toBe(
      true,
    );
  });

  it("tracks get_20_likes and comment_5 independently of each other", () => {
    const progress = evaluateChallenges(stats({ likesReceivedThisWeek: 20, commentsMadeThisWeek: 2 }));
    expect(find(progress, "get_20_likes").completed).toBe(true);
    expect(find(progress, "comment_5").completed).toBe(false);
  });
});
