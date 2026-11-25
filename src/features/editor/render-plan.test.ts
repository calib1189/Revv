import { describe, expect, it } from "vitest";
import { DEFAULT_EDIT_STATE, type EditState } from "./types";
import { audioPlanFor, outputFrameRate, outputSizeFor } from "./render-plan";

function edit(patch: Partial<EditState>): EditState {
  return { ...DEFAULT_EDIT_STATE, trimStart: 0, trimEnd: 10, ...patch };
}

describe("outputSizeFor", () => {
  it("keeps a 1080x1920 phone clip at full size for 9:16", () => {
    expect(outputSizeFor("9:16", 1080, 1920, 0)).toEqual({ width: 1080, height: 1920 });
  });

  it("brings a 4K portrait clip down to 1080 across", () => {
    expect(outputSizeFor("9:16", 2160, 3840, 0)).toEqual({ width: 1080, height: 1920 });
  });

  it("never upscales a small clip", () => {
    expect(outputSizeFor("9:16", 720, 1280, 0)).toEqual({ width: 720, height: 1280 });
  });

  it("crops a landscape clip to portrait from the pixels it actually has", () => {
    const { width, height } = outputSizeFor("9:16", 1920, 1080, 0);
    expect(height).toBe(1080);
    expect(Math.abs(width / height - 9 / 16)).toBeLessThan(0.01);
  });

  it("swaps the sides when the clip is turned a quarter", () => {
    const { width, height } = outputSizeFor("original", 1920, 1080, 90);
    expect(width).toBe(1080);
    expect(height).toBe(1920);
  });

  it("keeps the original shape when asked, within 1080 on the short side", () => {
    expect(outputSizeFor("original", 3840, 2160, 0)).toEqual({ width: 1920, height: 1080 });
    expect(outputSizeFor("1:1", 1080, 1920, 0)).toEqual({ width: 1080, height: 1080 });
  });

  it("always gives even sides, which the H.264 encoder needs", () => {
    const { width, height } = outputSizeFor("4:5", 1001, 1777, 0);
    expect(width % 2).toBe(0);
    expect(height % 2).toBe(0);
  });
});

describe("outputFrameRate", () => {
  it("keeps the clip's own rate within 24-60", () => {
    expect(outputFrameRate(29.97)).toBe(30);
    expect(outputFrameRate(60)).toBe(60);
    expect(outputFrameRate(120)).toBe(60);
    expect(outputFrameRate(15)).toBe(24);
  });

  it("falls back to 30 when the rate can't be read", () => {
    expect(outputFrameRate(NaN)).toBe(30);
    expect(outputFrameRate(0)).toBe(30);
  });
});

describe("audioPlanFor", () => {
  it("copies the clip's own sound untouched when nothing about it changed", () => {
    expect(audioPlanFor(edit({}))).toBe("copy");
  });

  it("drops the sound when the original is muted and nothing was added", () => {
    expect(audioPlanFor(edit({ originalVolume: 0 }))).toBe("none");
  });

  it("mixes when a sound or voiceover is added, the volume changes, or the speed does", () => {
    const file = new File([new Uint8Array(4)], "a.mp3", { type: "audio/mpeg" });
    expect(audioPlanFor(edit({ musicFile: file }))).toBe("mix");
    expect(audioPlanFor(edit({ originalVolume: 0, musicFile: file }))).toBe("mix");
    expect(audioPlanFor(edit({ voiceoverFile: file }))).toBe("mix");
    expect(audioPlanFor(edit({ originalVolume: 0.5 }))).toBe("mix");
    expect(audioPlanFor(edit({ playbackRate: 2 }))).toBe("mix");
  });

  it("drops a muted clip's sound even when it's sped up", () => {
    expect(audioPlanFor(edit({ originalVolume: 0, playbackRate: 0.5 }))).toBe("none");
  });
});
