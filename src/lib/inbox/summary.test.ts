import { describe, expect, it } from "vitest";
import { conversationStatus, summarizeNotifications } from "./summary";

const n = (kind: string, read: boolean, actor: string | null = "a", at = "2026-11-17T10:00:00Z") => ({
  kind,
  read_at: read ? at : null,
  actor_id: actor,
  created_at: at,
});

describe("summarizeNotifications", () => {
  it("splits people's activity from system notices, newest first", () => {
    const s = summarizeNotifications([
      n("comment_reply", false, "a", "2026-11-17T12:00:00Z"),
      n("ad_approved", true, null, "2026-11-17T11:00:00Z"),
      n("like", false, "b", "2026-11-17T10:00:00Z"),
      n("vehicle_verified", false, null, "2026-11-17T09:00:00Z"),
    ]);
    expect(s.activity.latest?.kind).toBe("comment_reply");
    expect(s.activity.unread).toBe(2);
    expect(s.system.latest?.kind).toBe("ad_approved");
    expect(s.system.unread).toBe(1);
  });

  it("is empty with no notifications", () => {
    const s = summarizeNotifications([]);
    expect(s.activity).toEqual({ latest: null, unread: 0 });
    expect(s.system).toEqual({ latest: null, unread: 0 });
  });
});

describe("conversationStatus", () => {
  const me = "me";
  it("shows their message, unread", () => {
    expect(conversationStatus({ sender_id: "them", body: "yo", read_at: null }, me)).toEqual({ text: "yo", unread: true, mine: false });
  });
  it("shows their message, read", () => {
    expect(conversationStatus({ sender_id: "them", body: "yo", read_at: "x" }, me)).toEqual({ text: "yo", unread: false, mine: false });
  });
  it("says Seen once they've read mine", () => {
    expect(conversationStatus({ sender_id: me, body: "yo", read_at: "x" }, me)).toEqual({ text: "Seen", unread: false, mine: true });
  });
  it("says Sent while mine is unread", () => {
    expect(conversationStatus({ sender_id: me, body: "yo", read_at: null }, me)).toEqual({ text: "Sent", unread: false, mine: true });
  });
  it("handles a conversation with no messages", () => {
    expect(conversationStatus(undefined, me)).toEqual({ text: "Say hi", unread: false, mine: false });
  });
});
