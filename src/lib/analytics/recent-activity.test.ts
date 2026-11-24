import { describe, expect, it } from "vitest";
import { countByDay, describeActivity, groupTimeline, splitByDay, summarizeActivity } from "./recent-activity";

describe("summarizeActivity", () => {
  it("rolls every kind into one row per user and keeps the newest time", () => {
    const rows = summarizeActivity([
      { userId: "a", at: "2026-11-23T10:00:00Z", kind: "view" },
      { userId: "a", at: "2026-11-23T12:00:00Z", kind: "comment" },
      { userId: "a", at: "2026-11-23T11:00:00Z", kind: "view" },
      { userId: "b", at: "2026-11-23T13:00:00Z", kind: "post" },
      { userId: "b", at: "2026-11-22T09:00:00Z", kind: "like" },
    ]);
    expect(rows).toEqual([
      { userId: "b", lastSeenAt: "2026-11-23T13:00:00Z", views: 0, likes: 1, comments: 0, posts: 1 },
      { userId: "a", lastSeenAt: "2026-11-23T12:00:00Z", views: 2, likes: 0, comments: 1, posts: 0 },
    ]);
  });

  it("compares times, not strings, so offsets order correctly", () => {
    const rows = summarizeActivity([
      { userId: "a", at: "2026-11-23T12:00:00+00:00", kind: "view" },
      { userId: "b", at: "2026-11-23T12:30:00.5+00:00", kind: "view" },
    ]);
    expect(rows.map((r) => r.userId)).toEqual(["b", "a"]);
  });

  it("is empty with no signals", () => {
    expect(summarizeActivity([])).toEqual([]);
  });
});

describe("describeActivity", () => {
  const base = { userId: "a", lastSeenAt: "2026-11-23T12:00:00Z", views: 0, likes: 0, comments: 0, posts: 0 };

  it("leads with the most deliberate actions and pluralizes", () => {
    expect(describeActivity({ ...base, posts: 1, comments: 3, likes: 1, views: 40 })).toBe(
      "1 post · 3 comments · 1 like · viewed 40 posts",
    );
  });

  it("capitalizes when only views are there", () => {
    expect(describeActivity({ ...base, views: 1 })).toBe("Viewed 1 post");
  });
});

describe("splitByDay", () => {
  it("splits at exactly 24 hours before now", () => {
    const now = Date.parse("2026-11-24T12:00:00Z");
    const row = (userId: string, lastSeenAt: string) => ({ userId, lastSeenAt, views: 1, likes: 0, comments: 0, posts: 0 });
    const { today, earlier } = splitByDay(
      [row("a", "2026-11-24T11:00:00Z"), row("b", "2026-11-23T12:00:00Z"), row("c", "2026-11-23T11:59:59Z")],
      now,
    );
    expect(today.map((r) => r.userId)).toEqual(["a", "b"]);
    expect(earlier.map((r) => r.userId)).toEqual(["c"]);
  });
});

describe("groupTimeline", () => {
  it("folds a scroll of views into one run and keeps deliberate actions separate", () => {
    const items = groupTimeline([
      { kind: "view", at: "2026-11-23T10:00:00Z", postId: "p1" },
      { kind: "view", at: "2026-11-23T10:05:00Z", postId: "p2" },
      { kind: "like", at: "2026-11-23T10:06:00Z", postId: "p2" },
      { kind: "view", at: "2026-11-23T10:07:00Z", postId: "p3" },
      { kind: "view", at: "2026-11-23T10:20:00Z", postId: "p4" },
      { kind: "comment", at: "2026-11-23T10:21:00Z", postId: "p4", body: "clean" },
    ]);
    expect(items.map((i) => [i.kind, i.count, i.startAt, i.at])).toEqual([
      ["comment", 1, "2026-11-23T10:21:00Z", "2026-11-23T10:21:00Z"],
      ["view", 2, "2026-11-23T10:07:00Z", "2026-11-23T10:20:00Z"],
      ["like", 1, "2026-11-23T10:06:00Z", "2026-11-23T10:06:00Z"],
      ["view", 2, "2026-11-23T10:00:00Z", "2026-11-23T10:05:00Z"],
    ]);
    expect(items[0].body).toBe("clean");
  });

  it("starts a new run after a 30 minute gap", () => {
    const items = groupTimeline([
      { kind: "view", at: "2026-11-23T10:00:00Z", postId: "p1" },
      { kind: "view", at: "2026-11-23T10:31:00Z", postId: "p2" },
    ]);
    expect(items.map((i) => i.count)).toEqual([1, 1]);
  });
});

describe("countByDay", () => {
  it("counts into the given days and ignores anything outside them", () => {
    const dayOf = (d: Date) => d.toISOString().slice(0, 10);
    expect(
      countByDay(
        [{ at: "2026-11-22T01:00:00Z" }, { at: "2026-11-22T23:00:00Z" }, { at: "2026-11-20T12:00:00Z" }],
        ["2026-11-21", "2026-11-22", "2026-11-23"],
        dayOf,
      ),
    ).toEqual([
      { key: "2026-11-21", count: 0 },
      { key: "2026-11-22", count: 2 },
      { key: "2026-11-23", count: 0 },
    ]);
  });
});
