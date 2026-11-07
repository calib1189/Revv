import { describe, expect, it } from "vitest";
import { planFeedVideo, feedVideoMaxBitrate, isWorthKeeping } from "./feed-video-plan";

const MB = 1024 * 1024;

describe("feedVideoMaxBitrate", () => {
  it("gives 1080p about 6 Mbps and 720p about 3.5 Mbps", () => {
    expect(feedVideoMaxBitrate(1080, 1920)).toBeGreaterThanOrEqual(5_800_000);
    expect(feedVideoMaxBitrate(1080, 1920)).toBeLessThanOrEqual(6_300_000);
    expect(feedVideoMaxBitrate(720, 1280)).toBeGreaterThanOrEqual(3_300_000);
    expect(feedVideoMaxBitrate(720, 1280)).toBeLessThanOrEqual(3_700_000);
  });
});

describe("planFeedVideo", () => {
  it("re-encodes a 40MB 1080p iPhone clip at full 1080p", () => {
    const plan = planFeedVideo({ width: 1080, height: 1920, durationMs: 25_900, bytes: 40.7 * MB });
    expect(plan).toEqual({ width: 1080, height: 1920, maxBitrate: feedVideoMaxBitrate(1080, 1920) });
  });

  it("re-encodes a 16 Mbps 720p export without changing its size", () => {
    const plan = planFeedVideo({ width: 720, height: 1280, durationMs: 5_800, bytes: 11.4 * MB });
    expect(plan).toEqual({ width: 720, height: 1280, maxBitrate: feedVideoMaxBitrate(720, 1280) });
  });

  it("leaves an already-lean clip alone, so it isn't encoded twice for nothing", () => {
    expect(planFeedVideo({ width: 720, height: 1280, durationMs: 21_100, bytes: 2.5 * MB })).toBeNull();
    expect(planFeedVideo({ width: 1080, height: 1920, durationMs: 10_000, bytes: 9 * MB })).toBeNull();
  });

  it("brings a 4K clip down to 1080 on its short side, keeping the shape", () => {
    expect(planFeedVideo({ width: 2160, height: 3840, durationMs: 10_000, bytes: 30 * MB })).toMatchObject({
      width: 1080,
      height: 1920,
    });
    expect(planFeedVideo({ width: 3840, height: 2160, durationMs: 10_000, bytes: 30 * MB })).toMatchObject({
      width: 1920,
      height: 1080,
    });
  });

  it("brings a 4K clip down even when its bitrate is already low", () => {
    expect(planFeedVideo({ width: 2160, height: 3840, durationMs: 60_000, bytes: 10 * MB })).not.toBeNull();
  });

  it("keeps both sides even, which H.264 needs", () => {
    const plan = planFeedVideo({ width: 1440, height: 2566, durationMs: 10_000, bytes: 40 * MB });
    expect(plan!.width % 2).toBe(0);
    expect(plan!.height % 2).toBe(0);
    expect(plan!.width).toBe(1080);
  });

  it("returns null when it can't tell the length or size", () => {
    expect(planFeedVideo({ width: 1080, height: 1920, durationMs: 0, bytes: 40 * MB })).toBeNull();
    expect(planFeedVideo({ width: 0, height: 0, durationMs: 10_000, bytes: 40 * MB })).toBeNull();
  });
});

describe("isWorthKeeping", () => {
  it("keeps the shrunk file only if it saves at least 15%", () => {
    expect(isWorthKeeping(40 * MB, 16 * MB)).toBe(true);
    expect(isWorthKeeping(10 * MB, 9 * MB)).toBe(false);
    expect(isWorthKeeping(10 * MB, 0)).toBe(false);
  });
});
