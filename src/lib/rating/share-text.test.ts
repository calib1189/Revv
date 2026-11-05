import { describe, expect, it } from "vitest";
import { buildShareText, formatScore } from "@/lib/rating/share-text";

describe("formatScore", () => {
  it("always shows two decimals", () => {
    expect(formatScore(91.4)).toBe("91.40");
    expect(formatScore(100)).toBe("100.00");
    expect(formatScore(87.346)).toBe("87.35");
  });
});

describe("buildShareText", () => {
  it("dares the reader to beat a rated build", () => {
    expect(buildShareText({ title: "Supra", score: 91.41, isOwner: true })).toBe(
      "My Supra scored 91.41 on SORZA. Think yours can beat it?",
    );
    expect(buildShareText({ title: "Supra", score: 91.41, isOwner: false })).toBe(
      "This Supra scored 91.41 on SORZA. Think yours can beat it?",
    );
  });

  it("just names an unrated build", () => {
    expect(buildShareText({ title: "Miata", score: null, isOwner: true })).toBe("My Miata on SORZA");
    expect(buildShareText({ title: "Miata", score: null, isOwner: false })).toBe("Check out this Miata on SORZA");
  });
});
