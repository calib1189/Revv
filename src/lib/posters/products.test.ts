import { describe, expect, it } from "vitest";
import { POSTER_PRODUCTS, effectivePhotoDpi, photoPrintsSharp, posterProductById, printPixels } from "@/lib/posters/products";

const poster = posterProductById("poster_18x24")!;
const framed = posterProductById("framed_12x18")!;

describe("poster products", () => {
  it("has the two sizes, priced in cents", () => {
    expect(POSTER_PRODUCTS.map((p) => p.id)).toEqual(["poster_18x24", "framed_12x18"]);
    for (const p of POSTER_PRODUCTS) expect(Number.isInteger(p.priceCents)).toBe(true);
    expect(posterProductById("nope")).toBeUndefined();
  });

  it("prints at the product's own aspect ratio", () => {
    const a = printPixels(poster);
    expect(a.width / a.height).toBeCloseTo(18 / 24);
    const b = printPixels(framed);
    expect(b.width / b.height).toBeCloseTo(12 / 18);
  });
});

describe("photo sharpness", () => {
  it("measures the photo against the poster's photo area, cropped to fill it", () => {
    // 18x24: the photo fills the full 18 in. width and the top 19 in.
    expect(effectivePhotoDpi({ width: 3600, height: 3800 }, poster)).toBeCloseTo(200);
    // A wide photo is limited by its height once it's cropped to fill.
    expect(effectivePhotoDpi({ width: 6000, height: 1900 }, poster)).toBeCloseTo(100);
  });

  it("allows the sharp photos and refuses the small ones", () => {
    expect(photoPrintsSharp({ width: 4284, height: 5712 }, poster)).toBe(true);
    expect(photoPrintsSharp({ width: 1875, height: 2500 }, poster)).toBe(true);
    expect(photoPrintsSharp({ width: 1290, height: 1707 }, poster)).toBe(false);
    // The smaller framed print needs less.
    expect(photoPrintsSharp({ width: 1290, height: 1707 }, framed)).toBe(true);
  });

  it("refuses a photo with no known size", () => {
    expect(photoPrintsSharp(null, poster)).toBe(false);
    expect(photoPrintsSharp({ width: null, height: 2000 }, poster)).toBe(false);
  });
});
