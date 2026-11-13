import { afterEach, describe, expect, it, vi } from "vitest";
import { TEE_DESIGNS, TEE_SIZES, merchEnabled, teeById, teeOrderLine, teePrintFiles } from "@/lib/merch/products";

afterEach(() => vi.unstubAllEnvs());

describe("tee catalog", () => {
  it("has the three designs, each in black, white or grey only", () => {
    expect(TEE_DESIGNS.map((d) => d.id)).toEqual(["big-s", "built-rated-ranked", "wordmark"]);
    for (const d of TEE_DESIGNS) expect(["Black", "White", "Dark Heather"]).toContain(d.color);
  });

  it("maps every design and size to its own Printful variant", () => {
    const ids = TEE_DESIGNS.flatMap((d) => TEE_SIZES.map((s) => d.variants[s]));
    expect(ids.every((id) => Number.isInteger(id) && id > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prices in whole cents, more for the bigger sizes that cost more to print", () => {
    const line = (size: string) => teeOrderLine("big-s", size);
    expect(line("S")?.priceCents).toBe(2999);
    expect(line("XL")?.priceCents).toBe(2999);
    expect(line("2XL")?.priceCents).toBe(3299);
    expect(line("3XL")?.priceCents).toBe(3499);
  });

  it("resolves an order line, and rejects anything off the menu", () => {
    expect(teeOrderLine("wordmark", "M")).toEqual({ design: teeById("wordmark"), size: "M", variantId: 15844, priceCents: 2999 });
    expect(teeOrderLine("wordmark", "XS")).toBeNull();
    expect(teeOrderLine("cosmic", "M")).toBeNull();
  });

  it("points Printful at a front and a back file for the design", () => {
    expect(teePrintFiles("big-s", "https://sorza.net")).toEqual([
      { type: "front", url: "https://sorza.net/merch/print/big-s-front.png" },
      { type: "back", url: "https://sorza.net/merch/print/big-s-back.png" },
    ]);
  });
});

describe("merchEnabled", () => {
  it("needs the switch (or an admin), Stripe and Printful", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test");
    vi.stubEnv("PRINTFUL_API_TOKEN", "pf");
    vi.stubEnv("MERCH_ENABLED", "");
    expect(merchEnabled()).toBe(false);
    expect(merchEnabled(true)).toBe(true);
    vi.stubEnv("MERCH_ENABLED", "true");
    expect(merchEnabled()).toBe(true);
    vi.stubEnv("PRINTFUL_API_TOKEN", "");
    expect(merchEnabled(true)).toBe(false);
  });
});
