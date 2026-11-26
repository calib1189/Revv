import { describe, expect, it } from "vitest";
import { isAnnouncementAgeReady, isAnnouncementBlockedPath, postAnnouncement, postAnnouncementUntil, POST_ANNOUNCEMENT_DAYS } from "@/lib/announcements";

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

describe("pop-up posts", () => {
  it("keys each post's pop-up by the post, so a new one shows again", () => {
    expect(postAnnouncement("abc")).toBe("post_abc");
    expect(postAnnouncement("abc")).not.toBe(postAnnouncement("def"));
  });

  it("runs for a week from when it's posted", () => {
    const now = Date.UTC(2026, 10, 26, 12, 0, 0);
    expect(postAnnouncementUntil(now)).toBe("2026-12-03T12:00:00.000Z");
    expect(POST_ANNOUNCEMENT_DAYS).toBe(7);
  });
});
