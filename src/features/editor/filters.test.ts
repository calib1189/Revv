import { describe, expect, it } from "vitest";
import { blendFilterPreset, getFilterPreset, FILTER_PRESETS } from "./filters";

describe("blendFilterPreset", () => {
  const vivid = getFilterPreset("vivid");

  it("intensity 0 is exactly identity, regardless of the preset", () => {
    const blended = blendFilterPreset(vivid, 0);
    expect(blended.brightness).toBe(1);
    expect(blended.contrast).toBe(1);
    expect(blended.saturate).toBe(1);
    expect(blended.grayscale).toBe(0);
    expect(blended.sepia).toBe(0);
    expect(blended.hueRotateDeg).toBe(0);
  });

  it("intensity 1 is exactly the preset's own designed strength", () => {
    const blended = blendFilterPreset(vivid, 1);
    expect(blended.brightness).toBeCloseTo(vivid.brightness, 10);
    expect(blended.contrast).toBeCloseTo(vivid.contrast, 10);
    expect(blended.saturate).toBeCloseTo(vivid.saturate, 10);
  });

  it("intensity 0.5 is exactly halfway between identity and full strength", () => {
    const blended = blendFilterPreset(vivid, 0.5);
    expect(blended.contrast).toBeCloseTo(1 + (vivid.contrast - 1) * 0.5, 10);
    expect(blended.saturate).toBeCloseTo(1 + (vivid.saturate - 1) * 0.5, 10);
  });

  it("is monotonic — higher intensity moves every parameter further from identity, never back toward it", () => {
    const vintage = getFilterPreset("vintage"); // has sepia, contrast<1, brightness>1, saturate>1
    const low = blendFilterPreset(vintage, 0.2);
    const high = blendFilterPreset(vintage, 0.8);
    expect(Math.abs(high.sepia - 0)).toBeGreaterThan(Math.abs(low.sepia - 0));
    expect(Math.abs(high.contrast - 1)).toBeGreaterThan(Math.abs(low.contrast - 1));
    expect(Math.abs(high.saturate - 1)).toBeGreaterThan(Math.abs(low.saturate - 1));
  });

  it("clamps out-of-range intensity instead of extrapolating past the preset", () => {
    const over = blendFilterPreset(vivid, 1.5);
    const exact = blendFilterPreset(vivid, 1);
    expect(over).toEqual(exact);

    const under = blendFilterPreset(vivid, -0.5);
    const zero = blendFilterPreset(vivid, 0);
    expect(under).toEqual(zero);
  });

  it("blending the identity 'original' preset at any intensity stays identity", () => {
    const original = getFilterPreset("original");
    const blended = blendFilterPreset(original, 0.7);
    expect(blended.brightness).toBe(1);
    expect(blended.contrast).toBe(1);
    expect(blended.saturate).toBe(1);
    expect(blended.grayscale).toBe(0);
    expect(blended.sepia).toBe(0);
    expect(blended.hueRotateDeg).toBe(0);
  });
});

describe("FILTER_PRESETS categories", () => {
  it("every preset except 'original' belongs to a real category", () => {
    for (const preset of FILTER_PRESETS) {
      if (preset.id === "original") {
        expect(preset.category).toBeNull();
      } else {
        expect(preset.category).not.toBeNull();
      }
    }
  });
});
