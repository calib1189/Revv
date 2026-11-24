import { describe, expect, it } from "vitest";
import { CHEST_ITEMS, CHEST_TABLE, DUPLICATE_POINTS, chestExpectedPoints, drawChest } from "./chest";
import { getStoreItem } from "@/lib/store/catalog";

const none = new Set<string>();

describe("the chest table", () => {
  it("adds up to certainty", () => {
    expect(CHEST_TABLE.reduce((s, e) => s + e.chance, 0)).toBeCloseTo(1, 10);
  });

  it("only holds cosmetics that exist, can't be bought, and appear once", () => {
    const all = Object.values(CHEST_ITEMS).flat();
    expect(new Set(all).size).toBe(all.length);
    for (const id of all) {
      const item = getStoreItem(id);
      expect(item, id).toBeDefined();
      expect(item!.streakOnly, id).toBe(true);
    }
  });
});

describe("drawChest", () => {
  it("makes most chests points", () => {
    expect(drawChest(0.1, 0, { firstChest: false, owned: none })).toEqual({ tier: "common", points: 10, itemId: null });
    expect(drawChest(0.6, 0, { firstChest: false, owned: none })).toEqual({ tier: "uncommon", points: 20, itemId: null });
    expect(drawChest(0.8, 0, { firstChest: false, owned: none })).toEqual({ tier: "rare", points: 40, itemId: null });
  });

  it("sometimes a cosmetic, rarer the higher it goes", () => {
    expect(drawChest(0.9, 0, { firstChest: false, owned: none })).toMatchObject({ tier: "rare", points: 0 });
    expect(drawChest(0.98, 0, { firstChest: false, owned: none }).tier).toBe("epic");
    expect(drawChest(0.999, 0, { firstChest: false, owned: none })).toEqual({
      tier: "legendary",
      points: 0,
      itemId: "name_supernova",
    });
  });

  it("uses `pick` to choose which cosmetic, so not everyone gets the same one", () => {
    const picks = new Set([0, 0.4, 0.8].map((p) => drawChest(0.9, p, { firstChest: false, owned: none }).itemId));
    expect(picks.size).toBe(CHEST_ITEMS.rare.length);
  });

  it("never gives a cosmetic you own, and pays points when you own them all", () => {
    const owned = new Set(["name_afterburner", "bg_burnout"]);
    expect(drawChest(0.9, 0, { firstChest: false, owned }).itemId).toBe("frame_streak");
    const everyRare = new Set(CHEST_ITEMS.rare);
    expect(drawChest(0.9, 0.5, { firstChest: false, owned: everyRare })).toEqual({
      tier: "rare",
      points: DUPLICATE_POINTS,
      itemId: null,
    });
  });

  it("always makes the first chest a Rare cosmetic, whatever the roll", () => {
    for (const roll of [0, 0.3, 0.99]) {
      const prize = drawChest(roll, 0.5, { firstChest: true, owned: none });
      expect(prize.tier).toBe("rare");
      expect(CHEST_ITEMS.rare).toContain(prize.itemId);
    }
  });
});

describe("chestExpectedPoints", () => {
  it("is more when every cosmetic is already owned", () => {
    expect(chestExpectedPoints(true)).toBeGreaterThan(chestExpectedPoints(false));
  });
});
