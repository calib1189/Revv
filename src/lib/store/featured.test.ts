import { describe, expect, it } from "vitest";
import { featuredItem, storeWeek } from "@/lib/store/featured";

describe("featuredItem", () => {
  it("picks a premium, sellable item from the shop's own categories", () => {
    for (let week = 0; week < 30; week++) {
      const item = featuredItem(["name_color", "profile_background", "showcase_frame"], week);
      expect(item).not.toBeNull();
      expect(item!.price).toBeGreaterThanOrEqual(800);
      expect(item!.founderOnly).toBeFalsy();
      expect(["name_color", "profile_background", "showcase_frame"]).toContain(item!.category);
    }
  });

  it("stays the same within a week and changes between weeks", () => {
    const a = storeWeek(new Date("2026-11-10T12:00:00Z"));
    expect(storeWeek(new Date("2026-11-11T12:00:00Z"))).toBe(a);
    const cats = ["name_color", "profile_background", "showcase_frame"] as const;
    expect(featuredItem([...cats], a)?.id).not.toBe(featuredItem([...cats], a + 1)?.id);
  });
});
