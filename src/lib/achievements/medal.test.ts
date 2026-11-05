import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS } from "@/lib/achievements/catalog";
import { medalDesign, medalMark, medalPattern, medalShape } from "@/lib/achievements/medal";

describe("achievement medals", () => {
  it("climbs the hardware ladder with difficulty", () => {
    expect(medalShape(10)).toBe("cap");
    expect(medalShape(20)).toBe("shield");
    expect(medalShape(35)).toBe("nut");
    expect(medalShape(60)).toBe("gear");
    expect(medalShape(100)).toBe("crest");
  });

  it("reads the milestone off the id", () => {
    expect(medalMark("posts_50")).toBe("50");
    expect(medalMark("likes_1000")).toBe("1K");
    expect(medalMark("followers_5000")).toBe("5K");
    expect(medalMark("invested_10000")).toBe("$10K");
    expect(medalMark("rated_5_times")).toBe("5");
    expect(medalMark("joined_3_crews")).toBe("3");
    expect(medalMark("hosted_5_meetups")).toBe("5");
    expect(medalMark("member_30_days")).toBe("30 D");
    expect(medalMark("member_1_year")).toBe("1 YR");
    expect(medalMark("top_100")).toBe("TOP 100");
    expect(medalMark("category_top_10")).toBe("TOP 10");
    expect(medalMark("number_one")).toBe("#1");
    expect(medalMark("improved_20")).toBe("+20");
    expect(medalMark("appearance_90")).toBe("90+");
    expect(medalMark("hundred_likes")).toBe("100");
    expect(medalMark("first_car")).toBeNull();
    expect(medalMark("profile_complete")).toBeNull();
  });

  it("gives the same achievement the same pattern every time", () => {
    expect(medalPattern("first_car")).toBe(medalPattern("first_car"));
  });

  it("never draws two achievements the same", () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const a of ACHIEVEMENTS) {
      if (a.tier) continue; // tier crests are their own artwork
      const d = medalDesign(a);
      const signature = [d.shape, d.color, d.mark ?? "-", a.icon?.name ?? "?"].join("|");
      const clash = seen.get(signature);
      if (clash) clashes.push(`${a.id} = ${clash}`);
      seen.set(signature, a.id);
    }
    expect(clashes).toEqual([]);
  });
});
