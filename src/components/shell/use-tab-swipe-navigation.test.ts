import { describe, expect, it } from "vitest";
import { resolveSwipeTarget, SWIPE_THRESHOLD_PX } from "./use-tab-swipe-navigation";

const TABS = ["/garage", "/feed", "/discover", "/leaderboard", "/parts"] as const;

describe("resolveSwipeTarget", () => {
  it("moves to the next tab on a leftward swipe past the threshold", () => {
    expect(resolveSwipeTarget("/feed", -100, 0, TABS)).toBe("/discover");
  });

  it("moves to the previous tab on a rightward swipe past the threshold", () => {
    expect(resolveSwipeTarget("/feed", 100, 0, TABS)).toBe("/garage");
  });

  it("does nothing on the first tab swiped right (nothing before it)", () => {
    expect(resolveSwipeTarget("/garage", 100, 0, TABS)).toBeNull();
  });

  it("does nothing on the last tab swiped left (nothing after it)", () => {
    expect(resolveSwipeTarget("/parts", -100, 0, TABS)).toBeNull();
  });

  it("does nothing below the distance threshold", () => {
    expect(resolveSwipeTarget("/feed", -(SWIPE_THRESHOLD_PX - 1), 0, TABS)).toBeNull();
  });

  it("does nothing right at and above the distance threshold", () => {
    expect(resolveSwipeTarget("/feed", -SWIPE_THRESHOLD_PX, 0, TABS)).toBe("/discover");
  });

  it("does nothing for a mostly-vertical drag, even if dx clears the threshold", () => {
    // A vertical feed scroll can easily rack up 100+ px of horizontal
    // jitter too — this must not get misread as a tab switch.
    expect(resolveSwipeTarget("/feed", -80, 200, TABS)).toBeNull();
  });

  it("does nothing on a page that isn't one of the tab pages", () => {
    expect(resolveSwipeTarget("/garage/some-vehicle-id", -100, 0, TABS)).toBeNull();
  });

  it("does nothing for a diagonal drag close to 45 degrees", () => {
    expect(resolveSwipeTarget("/feed", -80, 70, TABS)).toBeNull();
  });
});
