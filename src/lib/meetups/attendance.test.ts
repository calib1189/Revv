import { describe, expect, it } from "vitest";
import { isMeetupOver, meetRating, sortAttendees } from "@/lib/meetups/attendance";

describe("meetRating", () => {
  it("averages the rated cars to two decimals", () => {
    expect(meetRating([90, 80.5, 71.25])).toEqual({ average: 80.58, ratedCount: 3 });
  });

  it("leaves unrated cars and people without a car out of the average", () => {
    expect(meetRating([90, null, 80, null])).toEqual({ average: 85, ratedCount: 2 });
  });

  it("has no rating when nobody going has a rated car", () => {
    expect(meetRating([])).toEqual({ average: null, ratedCount: 0 });
    expect(meetRating([null, null])).toEqual({ average: null, ratedCount: 0 });
  });
});

describe("sortAttendees", () => {
  it("puts the highest-rated cars first and unrated ones after, in the order they said they're going", () => {
    const list = [
      { id: "a", score: null, joinedAt: "2026-11-01T10:00:00Z" },
      { id: "b", score: 71.2, joinedAt: "2026-11-01T11:00:00Z" },
      { id: "c", score: 93.4, joinedAt: "2026-11-01T12:00:00Z" },
      { id: "d", score: null, joinedAt: "2026-11-01T09:00:00Z" },
    ];
    expect(sortAttendees(list).map((a) => a.id)).toEqual(["c", "b", "d", "a"]);
  });

  it("does not reorder the list it was given", () => {
    const list = [
      { id: "a", score: 10, joinedAt: "2026-11-01T10:00:00Z" },
      { id: "b", score: 20, joinedAt: "2026-11-01T11:00:00Z" },
    ];
    sortAttendees(list);
    expect(list.map((a) => a.id)).toEqual(["a", "b"]);
  });
});

describe("isMeetupOver", () => {
  const start = "2026-11-06T18:00:00Z";
  it("is still on for three hours after it starts", () => {
    expect(isMeetupOver(start, Date.parse("2026-11-06T17:00:00Z"))).toBe(false);
    expect(isMeetupOver(start, Date.parse("2026-11-06T20:59:00Z"))).toBe(false);
  });

  it("is over once that window has passed", () => {
    expect(isMeetupOver(start, Date.parse("2026-11-06T21:01:00Z"))).toBe(true);
  });
});
