import { describe, expect, it } from "vitest";
import { computePlacements } from "./placements";

const e = (id: string, votes: number) => ({ submissionId: id, userId: `u-${id}`, votes });

describe("computePlacements", () => {
  it("ranks by votes, top three places", () => {
    const result = computePlacements([e("a", 2), e("b", 7), e("c", 4), e("d", 1)]);
    expect(result.map((p) => [p.submissionId, p.place])).toEqual([
      ["b", 1],
      ["c", 2],
      ["a", 3],
    ]);
  });

  it("shares a place on a tie and skips the next one (1, 1, 3)", () => {
    const result = computePlacements([e("a", 5), e("b", 5), e("c", 3), e("d", 2)]);
    expect(result.map((p) => [p.submissionId, p.place])).toEqual([
      ["a", 1],
      ["b", 1],
      ["c", 3],
    ]);
  });

  it("keeps everyone tied for a place, even past three entries", () => {
    const result = computePlacements([e("a", 4), e("b", 4), e("c", 4), e("d", 4), e("e", 1)]);
    expect(result).toHaveLength(4);
    expect(result.every((p) => p.place === 1)).toBe(true);
  });

  it("never places an entry with zero votes", () => {
    expect(computePlacements([e("a", 0), e("b", 0)])).toEqual([]);
    expect(computePlacements([e("a", 1), e("b", 0)]).map((p) => p.submissionId)).toEqual(["a"]);
  });

  it("gives a lone entry with a vote the win", () => {
    expect(computePlacements([e("a", 1)])).toEqual([{ submissionId: "a", userId: "u-a", votes: 1, place: 1 }]);
  });

  it("orders tied entries the same way every time", () => {
    const one = computePlacements([e("b", 3), e("a", 3)]);
    const two = computePlacements([e("a", 3), e("b", 3)]);
    expect(one).toEqual(two);
  });

  it("ignores invalid vote counts", () => {
    expect(computePlacements([e("a", -2), e("b", Number.NaN)])).toEqual([]);
  });
});
