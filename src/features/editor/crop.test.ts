import { describe, expect, it } from "vitest";
import { cropRectForAspect, aspectNeedsPan } from "./crop";

describe("cropRectForAspect", () => {
  it("never crops for 'original'", () => {
    expect(cropRectForAspect("original", 0.5, 1920, 1080)).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it("crops width (keeps full height) for a landscape clip to 9:16", () => {
    const rect = cropRectForAspect("9:16", 0.5, 1920, 1080);
    expect(rect.height).toBe(1);
    expect(rect.width).toBeCloseTo((9 / 16) / (1920 / 1080), 5);
    // Centered pan (0.5) should center the crop window horizontally.
    expect(rect.x).toBeCloseTo((1 - rect.width) / 2, 5);
  });

  it("pan offset 0 and 1 sit at the crop window's two extremes", () => {
    const left = cropRectForAspect("9:16", 0, 1920, 1080);
    const right = cropRectForAspect("9:16", 1, 1920, 1080);
    expect(left.x).toBeCloseTo(0, 5);
    expect(right.x).toBeCloseTo(1 - right.width, 5);
  });

  it("crops height (keeps full width) for a portrait clip to 1:1", () => {
    const rect = cropRectForAspect("1:1", 0.5, 1080, 1920);
    expect(rect.width).toBe(1);
    expect(rect.height).toBeCloseTo(1080 / 1920, 5);
  });

  it("returns a full-frame rect when video dimensions are unknown", () => {
    expect(cropRectForAspect("9:16", 0.5, 0, 0)).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it("crops nothing when the source already matches the target aspect", () => {
    const rect = cropRectForAspect("9:16", 0.5, 1080, 1920);
    expect(rect).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });
});

describe("cropRectForAspect with rotation", () => {
  it("targets the inverse aspect at 90° so the rotated result matches the requested ratio", () => {
    // A 1920x1080 landscape source, rotated 90°, cropped to 9:16: the
    // pre-rotation crop should actually be a 16:9 window (the inverse of
    // 9/16) so that after rotating 90° it reads as 9:16.
    const rotated = cropRectForAspect("9:16", 0.5, 1920, 1080, 90);
    const equivalent = cropRectForAspect("9:16", 0.5, 1080, 1920, 0);
    // Cropping a 1920x1080 frame to 16:9 crops nothing (it already is
    // 16:9) — same shape as cropping a 1080x1920 frame to 9:16.
    expect(rotated).toEqual(equivalent);
  });

  it("270° behaves the same as 90° for the crop rect (both swap the axis)", () => {
    const at90 = cropRectForAspect("1:1", 0.5, 1920, 1080, 90);
    const at270 = cropRectForAspect("1:1", 0.5, 1920, 1080, 270);
    expect(at90).toEqual(at270);
  });

  it("180° behaves the same as 0° (no axis swap)", () => {
    const at0 = cropRectForAspect("9:16", 0.5, 1920, 1080, 0);
    const at180 = cropRectForAspect("9:16", 0.5, 1920, 1080, 180);
    expect(at0).toEqual(at180);
  });
});

describe("aspectNeedsPan", () => {
  it("is false for 'original'", () => {
    expect(aspectNeedsPan("original", 1920, 1080)).toBe(false);
  });

  it("is false when the clip already matches the target aspect", () => {
    expect(aspectNeedsPan("9:16", 1080, 1920)).toBe(false);
  });

  it("is true when the target aspect actually crops the clip", () => {
    expect(aspectNeedsPan("9:16", 1920, 1080)).toBe(true);
    expect(aspectNeedsPan("1:1", 1920, 1080)).toBe(true);
  });
});
