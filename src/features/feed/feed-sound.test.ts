import { describe, expect, it } from "vitest";
import { isAutoplayBlocked, isFeedMuted, setFeedMuted } from "@/features/feed/feed-sound";

describe("isAutoplayBlocked", () => {
  it("is true only for the browser refusing sound without a tap", () => {
    expect(isAutoplayBlocked(new DOMException("needs a gesture", "NotAllowedError"))).toBe(true);
  });

  it("ignores an interrupted play or a video that hasn't loaded", () => {
    expect(isAutoplayBlocked(new DOMException("interrupted by pause()", "AbortError"))).toBe(false);
    expect(isAutoplayBlocked(new DOMException("no supported source", "NotSupportedError"))).toBe(false);
    expect(isAutoplayBlocked(new Error("something else"))).toBe(false);
    expect(isAutoplayBlocked(undefined)).toBe(false);
  });
});

describe("feed mute", () => {
  it("starts with sound on and remembers the viewer's choice", () => {
    expect(isFeedMuted()).toBe(false);
    setFeedMuted(true);
    expect(isFeedMuted()).toBe(true);
    setFeedMuted(false);
    expect(isFeedMuted()).toBe(false);
  });
});
