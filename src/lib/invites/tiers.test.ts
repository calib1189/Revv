import { describe, expect, it } from "vitest";
import {
  INVITE_TIERS,
  canNameInviter,
  countedInvites,
  inviteProgress,
  inviteLeaders,
  invitePath,
  parseInviterInput,
} from "@/lib/invites/tiers";

describe("countedInvites", () => {
  it("counts only invites who added a car", () => {
    expect(countedInvites([{ hasCar: true }, { hasCar: false }, { hasCar: true }])).toBe(2);
    expect(countedInvites([])).toBe(0);
  });
});

describe("inviteProgress", () => {
  it("starts with nothing reached and 3 to go", () => {
    expect(inviteProgress(0)).toEqual({ reached: [], next: INVITE_TIERS[0], toNext: 3 });
  });

  it("reaches a rung exactly at its count", () => {
    const p = inviteProgress(5);
    expect(p.reached.map((t) => t.count)).toEqual([3, 5]);
    expect(p.next?.count).toBe(10);
    expect(p.toNext).toBe(5);
  });

  it("has no next rung past the top", () => {
    const p = inviteProgress(40);
    expect(p.reached).toHaveLength(INVITE_TIERS.length);
    expect(p.next).toBeNull();
    expect(p.toNext).toBe(0);
  });

  it("keeps the ladder in ascending order", () => {
    const counts = INVITE_TIERS.map((t) => t.count);
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
  });
});

describe("canNameInviter", () => {
  const now = new Date("2026-11-13T12:00:00Z").getTime();
  it("allows the first week", () => {
    expect(canNameInviter("2026-11-07T13:00:00Z", now)).toBe(true);
  });
  it("closes after 7 days", () => {
    expect(canNameInviter("2026-11-06T11:00:00Z", now)).toBe(false);
  });
});

describe("parseInviterInput", () => {
  it("strips the @ and lowercases", () => {
    expect(parseInviterInput("  @Turbo_Dan ")).toBe("turbo_dan");
  });
  it("reads a pasted invite link", () => {
    expect(parseInviterInput("https://sorza.net/join/turbo_dan?x=1")).toBe("turbo_dan");
  });
  it("rejects anything that can't be a username", () => {
    expect(parseInviterInput("")).toBeNull();
    expect(parseInviterInput("ab")).toBeNull();
    expect(parseInviterInput("turbo dan")).toBeNull();
  });
});

describe("invitePath", () => {
  it("builds the join link", () => {
    expect(invitePath("turbo_dan")).toBe("/join/turbo_dan");
  });
});

describe("inviteLeaders", () => {
  const r = (referrer_id: string, invitee_id: string, created_at: string) => ({ referrer_id, invitee_id, created_at });

  it("ranks by invites that count, then by signups", () => {
    const leaders = inviteLeaders(
      [
        r("a", "a1", "2026-11-10"),
        r("a", "a2", "2026-11-09"),
        r("a", "a3", "2026-11-08"),
        r("b", "b1", "2026-11-12"),
        r("b", "b2", "2026-11-11"),
        r("c", "c1", "2026-11-01"),
      ],
      new Set(["b1", "b2", "a1"]),
    );
    expect(leaders.map((l) => [l.referrerId, l.counted, l.total])).toEqual([
      ["b", 2, 2],
      ["a", 1, 3],
      ["c", 0, 1],
    ]);
    expect(leaders[1].lastInviteAt).toBe("2026-11-10");
  });

  it("is empty with no invites", () => {
    expect(inviteLeaders([], new Set())).toEqual([]);
  });
});
