import { describe, expect, it } from "vitest";
import { validateSoundForm, clampSoundStartMs, SOUND_CLIP_MS } from "./sound";

const valid = { title: "Late Night Cruise", artistName: "SORZA Originals" };

describe("validateSoundForm", () => {
  it("passes for a fully valid entry", () => {
    expect(validateSoundForm(valid)).toEqual({});
  });

  it("passes with no artist name", () => {
    expect(validateSoundForm({ ...valid, artistName: "" })).toEqual({});
  });

  it("rejects an empty title", () => {
    expect(validateSoundForm({ ...valid, title: "" }).title).toMatch(/name/i);
  });

  it("rejects a title that's only whitespace", () => {
    expect(validateSoundForm({ ...valid, title: "   " }).title).toMatch(/name/i);
  });

  it("rejects a title over 80 characters", () => {
    expect(validateSoundForm({ ...valid, title: "A".repeat(81) }).title).toMatch(/80 characters/i);
  });

  it("accepts a title exactly at 80 characters", () => {
    expect(validateSoundForm({ ...valid, title: "A".repeat(80) }).title).toBeUndefined();
  });

  it("rejects an artist name over 80 characters", () => {
    expect(validateSoundForm({ ...valid, artistName: "A".repeat(81) }).artistName).toMatch(
      /80 characters/i,
    );
  });
});

describe("clampSoundStartMs", () => {
  it("keeps a start point that already leaves room for a full clip", () => {
    expect(clampSoundStartMs(10_000, 60_000)).toBe(10_000);
  });

  it("pulls a too-late start point back so the clip still fits", () => {
    expect(clampSoundStartMs(59_000, 60_000)).toBe(60_000 - SOUND_CLIP_MS);
  });

  it("never goes negative", () => {
    expect(clampSoundStartMs(-5_000, 60_000)).toBe(0);
  });

  it("always starts at 0 when the sound is shorter than one clip", () => {
    expect(clampSoundStartMs(2_000, 10_000)).toBe(0);
  });

  it("starts at 0 for a sound exactly one clip long", () => {
    expect(clampSoundStartMs(1_000, SOUND_CLIP_MS)).toBe(0);
  });

  it("rounds a fractional start point", () => {
    expect(clampSoundStartMs(10_000.6, 60_000)).toBe(10_001);
  });

  it("falls back to 0 for a non-finite input", () => {
    expect(clampSoundStartMs(Number.NaN, 60_000)).toBe(0);
  });
});
