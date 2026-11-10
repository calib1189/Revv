import { describe, expect, it } from "vitest";
import { POINT_PACKS, packByAppleProductId, packById } from "@/lib/points/packs";

describe("point packs", () => {
  it("prices every pack in whole cents and gives bigger packs more points per dollar", () => {
    for (const p of POINT_PACKS) {
      expect(Number.isInteger(p.priceCents)).toBe(true);
      expect(p.points).toBeGreaterThan(0);
    }
    const perDollar = POINT_PACKS.map((p) => p.points / p.priceCents);
    for (let i = 1; i < perDollar.length; i++) expect(perDollar[i]).toBeGreaterThan(perDollar[i - 1]);
  });

  it("has unique ids and Apple product ids", () => {
    expect(new Set(POINT_PACKS.map((p) => p.id)).size).toBe(POINT_PACKS.length);
    expect(new Set(POINT_PACKS.map((p) => p.appleProductId)).size).toBe(POINT_PACKS.length);
  });

  it("looks packs up by id and by Apple product id, and nothing else", () => {
    const first = POINT_PACKS[0];
    expect(packById(first.id)).toBe(first);
    expect(packByAppleProductId(first.appleProductId)).toBe(first);
    expect(packById("free_million")).toBeNull();
    expect(packByAppleProductId("com.other.app.points")).toBeNull();
  });
});
