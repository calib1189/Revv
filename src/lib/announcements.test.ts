import { describe, expect, it } from "vitest";
import { isAnnouncementAgeReady, isAnnouncementBlockedPath } from "@/lib/announcements";

describe("isAnnouncementAgeReady", () => {
  const now = new Date("2026-11-14T12:00:00Z").getTime();
  it("waits out an account's first day", () => {
    expect(isAnnouncementAgeReady("2026-11-14T01:00:00Z", now)).toBe(false);
  });
  it("shows to accounts a day old or more", () => {
    expect(isAnnouncementAgeReady("2026-11-13T12:00:00Z", now)).toBe(true);
    expect(isAnnouncementAgeReady("2026-01-01T00:00:00Z", now)).toBe(true);
  });
});

describe("isAnnouncementBlockedPath", () => {
  it("never covers sign-in or the invite screens", () => {
    expect(isAnnouncementBlockedPath("/login")).toBe(true);
    expect(isAnnouncementBlockedPath("/invite")).toBe(true);
    expect(isAnnouncementBlockedPath("/join/turbo_dan")).toBe(true);
  });
  it("shows anywhere else", () => {
    expect(isAnnouncementBlockedPath("/feed")).toBe(false);
    expect(isAnnouncementBlockedPath("/inviter")).toBe(false);
  });
});
