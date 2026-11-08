import { describe, expect, it } from "vitest";
import { normalizeCaption, normalizeChallengeText } from "./validation";

describe("normalizeCaption", () => {
  it("trims, collapses spaces and nulls blanks", () => {
    expect(normalizeCaption("  Fresh   wash, new wheels  ")).toEqual({ value: "Fresh wash, new wheels" });
    expect(normalizeCaption("   ")).toEqual({ value: null });
  });
  it("rejects captions over 150 characters", () => {
    expect(normalizeCaption("x".repeat(151))).toHaveProperty("error");
    expect(normalizeCaption("x".repeat(150))).toEqual({ value: "x".repeat(150) });
  });
});

describe("normalizeChallengeText", () => {
  it("requires a title and description within limits", () => {
    expect(normalizeChallengeText({ title: " Best Stance ", description: " Get low. " })).toEqual({
      value: { title: "Best Stance", description: "Get low." },
    });
    expect(normalizeChallengeText({ title: "", description: "x" })).toHaveProperty("error");
    expect(normalizeChallengeText({ title: "x", description: "" })).toHaveProperty("error");
    expect(normalizeChallengeText({ title: "x".repeat(61), description: "x" })).toHaveProperty("error");
    expect(normalizeChallengeText({ title: "x", description: "x".repeat(281) })).toHaveProperty("error");
  });
});
