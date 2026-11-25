import { describe, expect, it } from "vitest";
import { voteSequence, voteTickTimes } from "@/lib/battles/vote-sequence";

const tally = (seq: string[]) => ({ a: seq.filter((s) => s === "a").length, b: seq.filter((s) => s === "b").length });

describe("voteSequence", () => {
  it("lands exactly on the totals", () => {
    for (const [a, b] of [
      [6, 2],
      [2, 6],
      [1, 0],
      [0, 3],
      [5, 5],
      [137, 61],
    ]) {
      const seq = voteSequence(a, b);
      expect(seq).toHaveLength(a + b);
      expect(tally(seq)).toEqual({ a, b });
    }
  });

  it("spreads the smaller side through the run instead of bunching it", () => {
    expect(voteSequence(6, 2)).toEqual(["a", "a", "b", "a", "a", "a", "b", "a"]);
  });

  it("is empty when nobody voted", () => {
    expect(voteSequence(0, 0)).toEqual([]);
  });
});

describe("voteTickTimes", () => {
  it("gives one rising time per vote, within the count's window", () => {
    const times = voteTickTimes(8);
    expect(times).toHaveLength(8);
    expect(times.every((t, i) => i === 0 || t > times[i - 1])).toBe(true);
    expect(times.at(-1)).toBeLessThanOrEqual(2400);
  });

  it("keeps a big battle from dragging", () => {
    expect(voteTickTimes(500).at(-1)).toBe(2400);
  });
});
