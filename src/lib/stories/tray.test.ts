import { describe, expect, it } from "vitest";
import { buildTray, startIndex, storyAge, validateStoryCaption, type StoryLite } from "@/lib/stories/tray";

const s = (id: string, authorId: string, createdAt: string): StoryLite => ({ id, authorId, createdAt });

describe("buildTray", () => {
  const stories = [
    s("a1", "alice", "2026-11-13T08:00:00Z"),
    s("a2", "alice", "2026-11-13T10:00:00Z"),
    s("b1", "bob", "2026-11-13T11:00:00Z"),
    s("c1", "cara", "2026-11-13T12:00:00Z"),
    s("m1", "me", "2026-11-13T07:00:00Z"),
  ];

  it("puts your own story first, then people with something new, newest first, then the ones you've watched", () => {
    const tray = buildTray(stories, new Set(["c1"]), "me");
    expect(tray.map((e) => e.authorId)).toEqual(["me", "bob", "alice", "cara"]);
  });

  it("marks an author unseen until every one of their stories is watched", () => {
    const partly = buildTray(stories, new Set(["a1"]), "me").find((e) => e.authorId === "alice");
    expect(partly).toMatchObject({ hasUnseen: true, storyCount: 2, latestAt: "2026-11-13T10:00:00Z" });
    const all = buildTray(stories, new Set(["a1", "a2"]), "me").find((e) => e.authorId === "alice");
    expect(all?.hasUnseen).toBe(false);
  });

  it("never marks your own story as new to you", () => {
    expect(buildTray(stories, new Set(), "me")[0]).toMatchObject({ authorId: "me", isOwn: true, hasUnseen: false });
  });

  it("is empty when there are no stories", () => {
    expect(buildTray([], new Set(), "me")).toEqual([]);
  });
});

describe("startIndex", () => {
  const ids = ["x1", "x2", "x3"];
  it("picks up at the first story you haven't watched", () => {
    expect(startIndex(ids, new Set(["x1"]))).toBe(1);
  });
  it("starts from the beginning once you've watched them all", () => {
    expect(startIndex(ids, new Set(ids))).toBe(0);
  });
});

describe("validateStoryCaption", () => {
  it("trims, allows empty, and caps the length", () => {
    expect(validateStoryCaption("  hi  ")).toEqual({ ok: true, caption: "hi" });
    expect(validateStoryCaption("   ")).toEqual({ ok: true, caption: null });
    expect(validateStoryCaption("x".repeat(201)).ok).toBe(false);
  });
});

describe("storyAge", () => {
  const now = new Date("2026-11-13T12:00:00Z");
  it("reads like a story header", () => {
    expect(storyAge("2026-11-13T11:59:40Z", now)).toBe("now");
    expect(storyAge("2026-11-13T11:48:00Z", now)).toBe("12m");
    expect(storyAge("2026-11-13T09:00:00Z", now)).toBe("3h");
  });
});
