import { describe, expect, it } from "vitest";
import { rarityFor } from "@/lib/store/rarity";

describe("rarityFor", () => {
  it("bands items by price", () => {
    expect(rarityFor(50)).toBe("common");
    expect(rarityFor(99)).toBe("common");
    expect(rarityFor(100)).toBe("rare");
    expect(rarityFor(199)).toBe("rare");
    expect(rarityFor(200)).toBe("epic");
    expect(rarityFor(349)).toBe("epic");
    expect(rarityFor(350)).toBe("legendary");
    expect(rarityFor(550)).toBe("legendary");
  });

  it("marks founder items as founder whatever their price", () => {
    expect(rarityFor(0, true)).toBe("founder");
  });
});
