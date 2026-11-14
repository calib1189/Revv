import { describe, expect, it } from "vitest";
import { isSilent, SILENCE_PEAK } from "@/lib/sounds/silence";

describe("isSilent", () => {
  it("treats no channels and empty channels as silent", () => {
    expect(isSilent([])).toBe(true);
    expect(isSilent([new Float32Array(0)])).toBe(true);
  });

  it("treats near-zero noise as silent", () => {
    expect(isSilent([new Float32Array([0, 0.001, -0.004, 0.009])])).toBe(true);
  });

  it("hears a sample past the threshold, positive or negative", () => {
    expect(isSilent([new Float32Array([0, SILENCE_PEAK * 1.5])])).toBe(false);
    expect(isSilent([new Float32Array([0, -0.5])])).toBe(false);
  });

  it("hears sound in any channel", () => {
    expect(isSilent([new Float32Array([0, 0]), new Float32Array([0, 0.2])])).toBe(false);
  });
});
