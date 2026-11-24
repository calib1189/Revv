import { describe, expect, it } from "vitest";
import { scoreLink } from "./score-link";

const car = (id: string, over: Partial<{ hasPhoto: boolean; rated: boolean }> = {}) => ({
  id,
  hasPhoto: true,
  rated: false,
  ...over,
});

describe("scoreLink", () => {
  it("sends someone with no car to add one", () => {
    expect(scoreLink([])).toBe("/garage/new");
  });

  it("starts the score on the first unscored car that has a photo", () => {
    expect(scoreLink([car("a", { hasPhoto: false }), car("b"), car("c")])).toBe("/garage/b?score=1");
  });

  it("asks for a photo when no unscored car has one", () => {
    expect(scoreLink([car("a", { rated: true }), car("b", { hasPhoto: false })])).toBe("/garage/b#manage");
  });

  it("shows the existing score when every car is scored", () => {
    expect(scoreLink([car("a", { rated: true })])).toBe("/garage/a#rate");
  });
});
