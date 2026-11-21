import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TEE_COLORS,
  TEE_DESIGNS,
  TEE_SIZES,
  isTeeColor,
  merchEnabled,
  teeById,
  teeColorForVariant,
  teeOrderLine,
  teePhotos3d,
  teePhotos4k,
  teePrintFiles,
  teeOnSale,
  teesOnSale,
} from "@/lib/merch/products";

afterEach(() => vi.unstubAllEnvs());

const BEFORE_END = Date.parse("2026-12-07T04:59:58Z");
const AFTER_END = Date.parse("2026-12-07T05:00:00Z");

describe("tee catalog", () => {
  it("has the three core designs in black, grey and white, and the Sunset drop in black, white and sky", () => {
    expect(TEE_DESIGNS.map((d) => d.id)).toEqual(["sunset", "big-s", "built-rated-ranked", "wordmark"]);
    expect(TEE_COLORS).toEqual(["black", "grey", "white", "sky"]);
    expect(TEE_DESIGNS.map((d) => d.defaultColor)).toEqual(["sky", "black", "white", "grey"]);
    for (const id of ["big-s", "built-rated-ranked", "wordmark"]) expect(teeById(id)?.colors).toEqual(["black", "grey", "white"]);
    expect(teeById("sunset")?.colors).toEqual(["black", "white", "sky"]);
  });

  it("only sells a design in its own colours", () => {
    expect(teeOrderLine("sunset", "M", "sky", BEFORE_END)?.variantId).toBe(14982);
    expect(teeOrderLine("sunset", "M", "grey", BEFORE_END)).toBeNull();
    expect(teeOrderLine("big-s", "M", "sky")).toBeNull();
  });

  it("ends the Sunset drop at its end date, and leaves the core tees on sale", () => {
    const sunset = teeById("sunset")!;
    expect(sunset.endsAt).toBe("2026-12-07T04:59:59Z");
    expect(teeOnSale(sunset, BEFORE_END)).toBe(true);
    expect(teeOnSale(sunset, AFTER_END)).toBe(false);
    expect(teeOrderLine("sunset", "L", "black", AFTER_END)).toBeNull();
    expect(teeOrderLine("big-s", "L", "black", AFTER_END)?.variantId).toBe(11548);
    expect(teeOnSale(teeById("big-s")!, AFTER_END)).toBe(true);
    expect(teesOnSale(AFTER_END).map((d) => d.id)).toEqual(["big-s", "built-rated-ranked", "wordmark"]);
    expect(teesOnSale(BEFORE_END).map((d) => d.id)).toEqual(["sunset", "big-s", "built-rated-ranked", "wordmark"]);
  });

  it("maps every colour and size to its own Printful variant", () => {
    const line = (c: string, s: string) => teeOrderLine(c === "sky" ? "sunset" : "big-s", s, c, BEFORE_END)?.variantId;
    const ids = TEE_COLORS.flatMap((c) => TEE_SIZES.map((s) => line(c, s)));
    expect(ids.every((id) => Number.isInteger(id) && (id ?? 0) > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses the same Printful variants as before for each colour", () => {
    expect(teeOrderLine("big-s", "L", "black")?.variantId).toBe(11548);
    expect(teeOrderLine("big-s", "L", "white")?.variantId).toBe(11578);
    expect(teeOrderLine("big-s", "L", "grey")?.variantId).toBe(15845);
  });

  it("prices in whole cents, more for the bigger sizes, the same in every colour", () => {
    for (const color of TEE_COLORS) {
      const line = (size: string) => teeOrderLine(color === "sky" ? "sunset" : "big-s", size, color, BEFORE_END);
      expect(line("S")?.priceCents).toBe(2999);
      expect(line("XL")?.priceCents).toBe(2999);
      expect(line("2XL")?.priceCents).toBe(3299);
      expect(line("3XL")?.priceCents).toBe(3499);
    }
  });

  it("resolves an order line, and rejects anything off the menu", () => {
    expect(teeOrderLine("wordmark", "M", "grey")).toEqual({
      design: teeById("wordmark"),
      size: "M",
      color: "grey",
      variantId: 15844,
      priceCents: 2999,
    });
    expect(teeOrderLine("wordmark", "XS", "grey")).toBeNull();
    expect(teeOrderLine("cosmic", "M", "grey")).toBeNull();
    expect(teeOrderLine("wordmark", "M", "red")).toBeNull();
  });

  it("knows a colour from its variant, for orders already placed", () => {
    expect(teeColorForVariant(11546)).toBe("black");
    expect(teeColorForVariant(12650)).toBe("white");
    expect(teeColorForVariant(15848)).toBe("grey");
    expect(teeColorForVariant(14986)).toBe("sky");
    expect(teeColorForVariant(1)).toBeNull();
    expect(isTeeColor("grey")).toBe(true);
    expect(isTeeColor("Dark Heather")).toBe(false);
  });

  it("prints dark ink on white shirts and white ink on black and grey", () => {
    const urls = (c: "black" | "grey" | "white") => teePrintFiles("big-s", c, "https://sorza.net");
    expect(urls("white")).toEqual([
      { type: "front", url: "https://sorza.net/merch/print/big-s-front-ink.png" },
      { type: "back", url: "https://sorza.net/merch/print/big-s-back-ink.png" },
    ]);
    expect(urls("black")[1].url).toBe("https://sorza.net/merch/print/big-s-back-white.png");
    expect(urls("grey")[1].url).toBe("https://sorza.net/merch/print/big-s-back-white.png");
    // sky is a light shirt, so it takes the dark-ink print like white
    expect(teePrintFiles("sunset", "sky", "https://sorza.net")[1].url).toBe("https://sorza.net/merch/print/sunset-back-ink.png");
    expect(teePrintFiles("sunset", "black", "https://sorza.net")[0].url).toBe("https://sorza.net/merch/print/sunset-front-white.png");
    // Built. Rated. Ranked. has its own file for dark heather; its others follow the shirt's ink
    expect(teePrintFiles("built-rated-ranked", "grey", "https://sorza.net")[1].url).toBe(
      "https://sorza.net/merch/print/built-rated-ranked-back-heather.png",
    );
    expect(teePrintFiles("built-rated-ranked", "black", "https://sorza.net")[1].url).toBe(
      "https://sorza.net/merch/print/built-rated-ranked-back-white.png",
    );
  });

  it("has shop photos for each design in each colour", () => {
    expect(teePhotos3d("wordmark", "white")).toEqual({
      front: "/merch/3d/wordmark-white-front.webp",
      back: "/merch/3d/wordmark-white-back.webp",
    });
    expect(teePhotos4k("big-s", "grey").back).toBe("/merch/4k/big-s-grey-back.webp");
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
