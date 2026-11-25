import { describe, expect, it } from "vitest";
import { FILTER_PRESETS, blendFilterPreset } from "./filters";
import { applyFilter } from "./pixel-filters";
import { colorMatrixFor, isIdentityMatrix, applyColorMatrix } from "./color-matrix";

/** Random but repeatable pixels, including the extremes. */
function samplePixels(): number[][] {
  const out: number[][] = [
    [0, 0, 0],
    [255, 255, 255],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [128, 128, 128],
  ];
  let s = 12345;
  for (let i = 0; i < 200; i++) {
    const px: number[] = [];
    for (let c = 0; c < 3; c++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      px.push(s % 256);
    }
    out.push(px);
  }
  return out;
}

function viaPixelFilter(px: number[], preset: (typeof FILTER_PRESETS)[number]): number[] {
  const data = new Uint8ClampedArray([px[0], px[1], px[2], 255]);
  const image = { data, width: 1, height: 1, colorSpace: "srgb" } as ImageData;
  applyFilter(image, preset);
  return [data[0], data[1], data[2]];
}

describe("colorMatrixFor", () => {
  it("is exactly the per-pixel filter chain, for every preset at several strengths", () => {
    const pixels = samplePixels();
    for (const base of FILTER_PRESETS) {
      for (const intensity of [0.25, 0.6, 1]) {
        const preset = blendFilterPreset(base, intensity);
        const m = colorMatrixFor(preset);
        for (const px of pixels) {
          const expected = viaPixelFilter(px, preset);
          const actual = applyColorMatrix(m, px);
          for (let c = 0; c < 3; c++) {
            // The pixel path stores into bytes (Uint8ClampedArray rounds);
            // the matrix is continuous. Within one level either way.
            expect(Math.abs(actual[c] - expected[c])).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it("is the identity for Original, and for any preset at zero strength", () => {
    expect(isIdentityMatrix(colorMatrixFor(FILTER_PRESETS[0]))).toBe(true);
    for (const base of FILTER_PRESETS) {
      expect(isIdentityMatrix(colorMatrixFor(blendFilterPreset(base, 0)))).toBe(true);
    }
  });

  it("is not the identity for a real filter", () => {
    const vivid = FILTER_PRESETS.find((p) => p.id === "vivid")!;
    expect(isIdentityMatrix(colorMatrixFor(vivid))).toBe(false);
  });

  it("keeps a black and white filter neutral: every channel comes out equal", () => {
    const bw = FILTER_PRESETS.find((p) => p.id === "bw")!;
    const m = colorMatrixFor(bw);
    const [r, g, b] = applyColorMatrix(m, [200, 40, 90]);
    expect(Math.abs(r - g)).toBeLessThan(0.001);
    expect(Math.abs(g - b)).toBeLessThan(0.001);
  });
});
