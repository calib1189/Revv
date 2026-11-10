import { describe, expect, it } from "vitest";
import { earnedDecalTier } from "@/lib/decals/eligibility";

const car = { ownerId: "u1", verificationStatus: "approved", score: 87.34 } as const;

describe("earnedDecalTier", () => {
  it("is the rank the car earned, for its owner", () => {
    expect(earnedDecalTier({ ...car, viewerId: "u1" })).toBe("diamond");
    expect(earnedDecalTier({ ...car, score: 91.2, viewerId: "u1" })).toBe("ruby");
    expect(earnedDecalTier({ ...car, score: 12, viewerId: "u1" })).toBe("bronze");
  });

  it("is nothing for anyone but the owner", () => {
    expect(earnedDecalTier({ ...car, viewerId: "u2" })).toBeNull();
    expect(earnedDecalTier({ ...car, viewerId: null })).toBeNull();
  });

  it("needs a car approved for the leaderboard", () => {
    for (const status of ["none", "pending", "rejected"]) {
      expect(earnedDecalTier({ ...car, verificationStatus: status, viewerId: "u1" })).toBeNull();
    }
  });

  it("needs a score", () => {
    expect(earnedDecalTier({ ...car, score: null, viewerId: "u1" })).toBeNull();
  });
});
