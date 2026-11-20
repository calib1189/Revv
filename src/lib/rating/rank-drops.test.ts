import { describe, expect, it } from "vitest";
import { bestDropPerOwner, findRankDrops, rankDropBody, scoreAsOf, type RankBoardEntry } from "./rank-drops";

const T0 = new Date("2026-11-19T20:00:00Z");

function entry(buildId: string, ownerId: string, scoreThen: number | null, scoreNow: number): RankBoardEntry {
  return { buildId, ownerId, scoreThen, scoreNow };
}

describe("scoreAsOf", () => {
  it("uses the current score when it was given before the cutoff", () => {
    expect(scoreAsOf({ score: 80, ratedAt: "2026-11-18T10:00:00Z" }, [], T0)).toBe(80);
  });

  it("treats a rated build with no rating time as rated long ago", () => {
    expect(scoreAsOf({ score: 70, ratedAt: null }, [], T0)).toBe(70);
  });

  it("falls back to the latest history row before the cutoff after a re-rate", () => {
    const history = [
      { score: 60, ratedAt: "2026-11-10T00:00:00Z" },
      { score: 65, ratedAt: "2026-11-15T00:00:00Z" },
      { score: 90, ratedAt: "2026-11-20T00:00:00Z" },
    ];
    expect(scoreAsOf({ score: 90, ratedAt: "2026-11-20T00:00:00Z" }, history, T0)).toBe(65);
  });

  it("is null for a build first rated after the cutoff", () => {
    const history = [{ score: 90, ratedAt: "2026-11-20T00:00:00Z" }];
    expect(scoreAsOf({ score: 90, ratedAt: "2026-11-20T00:00:00Z" }, history, T0)).toBeNull();
  });
});

describe("findRankDrops", () => {
  it("reports a build passed by a newly rated car, with who passed it", () => {
    const drops = findRankDrops([
      entry("a", "u1", 90, 90),
      entry("b", "u2", 80, 80),
      entry("new", "u3", null, 85),
    ]);
    expect(drops).toEqual([{ buildId: "b", ownerId: "u2", from: 2, to: 3, passedBy: ["new"] }]);
  });

  it("reports a build passed by a re-rated car that was below it", () => {
    const drops = findRankDrops([
      entry("a", "u1", 90, 90),
      entry("b", "u2", 80, 80),
      entry("c", "u3", 70, 95),
    ]);
    // "a" lost #1, which the instant push already covered.
    expect(drops.map((d) => [d.buildId, d.from, d.to, d.passedBy])).toEqual([["b", 2, 3, ["c"]]]);
  });

  it("doesn't count a car that was already ahead, or a tie, as passing", () => {
    const drops = findRankDrops([
      entry("a", "u1", 90, 92),
      entry("b", "u2", 80, 80),
      entry("c", "u3", 70, 80),
    ]);
    expect(drops).toEqual([]);
  });

  it("stays quiet when the owner's own re-rate is what dropped them", () => {
    const drops = findRankDrops([
      entry("a", "u1", 90, 90),
      entry("b", "u2", 85, 70),
      entry("c", "u3", 80, 80),
    ]);
    expect(drops).toEqual([]);
  });

  it("ignores being passed by your own other car", () => {
    const drops = findRankDrops([
      entry("a", "u1", 80, 80),
      entry("a2", "u1", null, 90),
    ]);
    expect(drops).toEqual([]);
  });

  it("only counts the other owners' cars when your own car also passed you", () => {
    const drops = findRankDrops([
      entry("top", "u9", 99, 99),
      entry("a", "u1", 80, 80),
      entry("a2", "u1", null, 90),
      entry("x", "u2", null, 85),
    ]);
    expect(drops).toEqual([{ buildId: "a", ownerId: "u1", from: 2, to: 4, passedBy: ["x"] }]);
  });

  it("leaves losing #1 and falling out of the top 10 to the instant push", () => {
    // Twelve builds; a new one at the top pushes #1 to #2 and #10 to #11.
    const board = Array.from({ length: 12 }, (_, i) => entry(`b${i + 1}`, `u${i + 1}`, 90 - i, 90 - i));
    board.push(entry("new", "z", null, 99));
    const drops = findRankDrops(board);
    const ids = drops.map((d) => d.buildId);
    expect(ids).not.toContain("b1");
    expect(ids).not.toContain("b10");
    expect(ids).toContain("b2");
    expect(ids).toContain("b11");
  });

  it("lists the passers best-scored first", () => {
    const drops = findRankDrops([
      entry("top", "u9", 99, 99),
      entry("me", "u1", 50, 50),
      entry("p1", "u2", null, 60),
      entry("p2", "u3", null, 70),
    ]);
    expect(drops[0].passedBy).toEqual(["p2", "p1"]);
  });
});

describe("bestDropPerOwner", () => {
  it("keeps each owner's highest-ranked dropped car", () => {
    const picked = bestDropPerOwner([
      { buildId: "x", ownerId: "u1", from: 30, to: 32, passedBy: ["p"] },
      { buildId: "y", ownerId: "u1", from: 12, to: 13, passedBy: ["p"] },
      { buildId: "z", ownerId: "u2", from: 5, to: 6, passedBy: ["p"] },
    ]);
    expect(picked.map((d) => d.buildId).sort()).toEqual(["y", "z"]);
  });
});

describe("rankDropBody", () => {
  it("names the one car that passed you", () => {
    expect(rankDropBody({ carName: "Civic Si", to: 24, passers: [{ username: "mike", carName: "Supra" }] })).toBe(
      "@mike's Supra passed your Civic Si. You're #24 now.",
    );
  });

  it("counts several", () => {
    expect(
      rankDropBody({
        carName: "Civic Si",
        to: 24,
        passers: [
          { username: "mike", carName: "Supra" },
          { username: "ana", carName: "M3" },
        ],
      }),
    ).toBe("2 cars passed your Civic Si since yesterday. You're #24 now.");
  });
});
