import { describe, expect, it } from "vitest";
import { normalizeRejectionReason, REJECTION_REASON_MAX } from "./rejection-reason";

describe("normalizeRejectionReason", () => {
  it("trims the message", () => {
    expect(normalizeRejectionReason("  Photo looks like it's from Google.  ")).toEqual({
      reason: "Photo looks like it's from Google.",
    });
  });

  it("treats an empty message as no message", () => {
    expect(normalizeRejectionReason("   ")).toEqual({ reason: null });
    expect(normalizeRejectionReason(null)).toEqual({ reason: null });
  });

  it("rejects a message over the limit", () => {
    expect(normalizeRejectionReason("a".repeat(REJECTION_REASON_MAX + 1)).error).toMatch(/500/);
    expect(normalizeRejectionReason("a".repeat(REJECTION_REASON_MAX)).reason).toHaveLength(REJECTION_REASON_MAX);
  });
});

describe("rejectionPushBody", () => {
  it("includes a short reason", async () => {
    const { rejectionPushBody } = await import("./rejection-reason");
    expect(rejectionPushBody("Civic", "Blurry photo")).toBe("Civic wasn't approved for the leaderboard: Blurry photo");
  });

  it("cuts a long reason and works without one", async () => {
    const { rejectionPushBody } = await import("./rejection-reason");
    expect(rejectionPushBody("Civic", null)).toBe("Civic wasn't approved for the leaderboard. Tap to see why.");
    const body = rejectionPushBody("Civic", "x".repeat(300));
    expect(body.length).toBeLessThanOrEqual(160);
    expect(body.endsWith("…")).toBe(true);
  });
});
