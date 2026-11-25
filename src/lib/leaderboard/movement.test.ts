import { describe, expect, it } from "vitest";
import { biggestClimb, rankMovement, type RankMovement } from "./movement";

describe("biggestClimb", () => {
  const ranked = [{ buildId: "a" }, { buildId: "b" }, { buildId: "c" }, { buildId: "d" }];

  it("picks the build that climbed the most places", () => {
    const moves = new Map<string, RankMovement>([
      ["a", { kind: "up", places: 3 }],
      ["c", { kind: "up", places: 14 }],
      ["d", { kind: "down", places: 20 }],
    ]);
    expect(biggestClimb(ranked, moves)).toEqual({ index: 2, places: 14 });
  });

  it("gives a tie to the build higher on the board", () => {
    const moves = new Map<string, RankMovement>([
      ["b", { kind: "up", places: 5 }],
      ["d", { kind: "up", places: 5 }],
    ]);
    expect(biggestClimb(ranked, moves)).toEqual({ index: 1, places: 5 });
  });

  it("ignores small moves and new builds", () => {
    const moves = new Map<string, RankMovement>([
      ["a", { kind: "up", places: 2 }],
      ["b", { kind: "new" }],
    ]);
    expect(biggestClimb(ranked, moves)).toBeNull();
  });
});

const since = new Date("2026-11-23T12:00:00Z");
const before = "2026-11-22T09:00:00Z";
const after = "2026-11-24T09:00:00Z";

describe("rankMovement", () => {
  it("shows a re-rate climbing past others, and the builds it passed going down", () => {
    const board = [
      { buildId: "a", score: 90, ratedAt: after }, // was 80: third, now first
      { buildId: "b", score: 88, ratedAt: before },
      { buildId: "c", score: 85, ratedAt: before },
      { buildId: "d", score: 70, ratedAt: before },
    ];
    const history = [{ buildId: "a", score: 80, ratedAt: before }];
    const moves = rankMovement(board, history, since);
    expect(moves.get("a")).toEqual({ kind: "up", places: 2 });
    expect(moves.get("b")).toEqual({ kind: "down", places: 1 });
    expect(moves.get("c")).toEqual({ kind: "down", places: 1 });
    expect(moves.has("d")).toBe(false);
  });

  it("marks a build first rated since then as new, and counts it against the others", () => {
    const board = [
      { buildId: "n", score: 95, ratedAt: after },
      { buildId: "b", score: 88, ratedAt: before },
    ];
    const moves = rankMovement(board, [], since);
    expect(moves.get("n")).toEqual({ kind: "new" });
    expect(moves.get("b")).toEqual({ kind: "down", places: 1 });
  });

  it("treats a score with no timestamp as unchanged", () => {
    const moves = rankMovement([{ buildId: "x", score: 60, ratedAt: null }], [], since);
    expect(moves.size).toBe(0);
  });

  it("gives tied scores the same place", () => {
    const board = [
      { buildId: "a", score: 80, ratedAt: before },
      { buildId: "b", score: 80, ratedAt: after },
    ];
    // b was 70 (second), now ties a for first.
    const moves = rankMovement(board, [{ buildId: "b", score: 70, ratedAt: before }], since);
    expect(moves.get("b")).toEqual({ kind: "up", places: 1 });
    expect(moves.has("a")).toBe(false);
  });
});
