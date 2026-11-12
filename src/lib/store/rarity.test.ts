import { describe, expect, it } from "vitest";
import { rarityFor } from "@/lib/store/rarity";

describe("rarityFor", () => {
  it("bands items by price", () => {
    expect(rarityFor(200)).toBe("common");
    expect(rarityFor(399)).toBe("common");
    expect(rarityFor(400)).toBe("rare");
    expect(rarityFor(799)).toBe("rare");
    expect(rarityFor(800)).toBe("epic");
    expect(rarityFor(1399)).toBe("epic");
    expect(rarityFor(1400)).toBe("legendary");
    expect(rarityFor(2200)).toBe("legendary");
  });

  it("marks founder items as founder whatever their price", () => {
    expect(rarityFor(0, true)).toBe("founder");
  });
});
