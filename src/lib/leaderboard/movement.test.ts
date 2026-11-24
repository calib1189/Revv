import { describe, expect, it } from "vitest";
import { rankMovement } from "./movement";

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
