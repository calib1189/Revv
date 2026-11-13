import { describe, expect, it } from "vitest";
import { isReaction, summarizeReactions, topReactions, totalReactions, withMyReaction } from "@/lib/reactions";

describe("reactions", () => {
  it("only knows the six reactions", () => {
    expect(isReaction("fire")).toBe(true);
    expect(isReaction("poop")).toBe(false);
    expect(isReaction(null)).toBe(false);
  });

  it("counts each reaction, most used first, and picks out the viewer's own", () => {
    const s = summarizeReactions(
      [
        { userId: "a", reaction: "fire" },
        { userId: "b", reaction: "heart" },
        { userId: "c", reaction: "fire" },
        { userId: "me", reaction: "laugh" },
        { userId: "d", reaction: "evil" },
      ],
      "me",
    );
    expect(topReactions(s)).toEqual(["fire", "heart", "laugh"]);
    expect(totalReactions(s)).toBe(4);
    expect(s.mine).toBe("laugh");
  });

  it("moves the viewer's reaction, and a reaction only they used goes away", () => {
    const s = summarizeReactions([{ userId: "a", reaction: "fire" }, { userId: "me", reaction: "laugh" }], "me");
    const switched = withMyReaction(s, "fire");
    expect(topReactions(switched)).toEqual(["fire"]);
    expect(totalReactions(switched)).toBe(2);
    const cleared = withMyReaction(switched, null);
    expect(totalReactions(cleared)).toBe(1);
    expect(cleared.mine).toBeNull();
  });
});
