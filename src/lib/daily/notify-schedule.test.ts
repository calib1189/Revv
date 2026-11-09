import { describe, expect, it } from "vitest";
import { decideScheduledPush, isQuietHour, localHourIn, mayNotifyVote, type PushPrefs, type DayState } from "./notify-schedule";

const prefs: PushPrefs = {
  dailyChallenge: true,
  dailyResults: true,
  dailyVotes: true,
  rateRide: true,
  quietHours: true,
  quietStart: 22,
  quietEnd: 8,
};
const state: DayState = {
  participatedYesterday: false,
  placeYesterday: null,
  yesterdayHadWinner: true,
  enteredToday: false,
  ratedRidesToday: false,
  ridesAvailable: true,
  minutesLeft: 600,
};

describe("isQuietHour", () => {
  it("handles windows that wrap midnight", () => {
    expect(isQuietHour(23, prefs)).toBe(true);
    expect(isQuietHour(3, prefs)).toBe(true);
    expect(isQuietHour(8, prefs)).toBe(false);
    expect(isQuietHour(21, prefs)).toBe(false);
  });
  it("handles same-day windows and the off switch", () => {
    expect(isQuietHour(14, { ...prefs, quietStart: 13, quietEnd: 15 })).toBe(true);
    expect(isQuietHour(15, { ...prefs, quietStart: 13, quietEnd: 15 })).toBe(false);
    expect(isQuietHour(3, { ...prefs, quietHours: false })).toBe(false);
  });
});

describe("localHourIn", () => {
  it("reads the hour in the person's zone, defaulting to Central", () => {
    const at = new Date("2026-11-08T15:30:00Z");
    expect(localHourIn("America/New_York", at)).toBe(10);
    expect(localHourIn("America/Los_Angeles", at)).toBe(7);
    expect(localHourIn(null, at)).toBe(9);
    expect(localHourIn("Not/AZone", at)).toBe(9);
  });
});

describe("decideScheduledPush", () => {
  it("sends the morning challenge-live push once, in the morning", () => {
    expect(decideScheduledPush({ localHour: 9, prefs, sent: new Set(), state })).toEqual({ kind: "morning", category: "daily_challenge", variant: "live" });
    expect(decideScheduledPush({ localHour: 9, prefs, sent: new Set(["morning"]), state })).toBeNull();
    expect(decideScheduledPush({ localHour: 6, prefs: { ...prefs, quietHours: false }, sent: new Set(), state })).toBeNull();
  });

  it("waits for quiet hours to end before the morning push", () => {
    const late = { ...prefs, quietEnd: 10 };
    expect(decideScheduledPush({ localHour: 9, prefs: late, sent: new Set(), state })).toBeNull();
    expect(decideScheduledPush({ localHour: 10, prefs: late, sent: new Set(), state })).not.toBeNull();
  });

  it("swaps the morning push for results when you took part yesterday", () => {
    expect(decideScheduledPush({ localHour: 10, prefs, sent: new Set(), state: { ...state, participatedYesterday: true } })).toEqual({
      kind: "morning",
      category: "daily_results",
      variant: "results",
    });
    expect(
      decideScheduledPush({ localHour: 10, prefs, sent: new Set(), state: { ...state, participatedYesterday: true, placeYesterday: 1 } }),
    ).toEqual({ kind: "morning", category: "daily_results", variant: "placed" });
  });

  it("sends today's challenge instead of results when yesterday had no winner", () => {
    expect(
      decideScheduledPush({
        localHour: 9,
        prefs,
        sent: new Set(),
        state: { ...state, participatedYesterday: true, yesterdayHadWinner: false },
      }),
    ).toEqual({ kind: "morning", category: "daily_challenge", variant: "live" });
  });

  it("respects switched-off categories", () => {
    expect(decideScheduledPush({ localHour: 9, prefs: { ...prefs, dailyChallenge: false }, sent: new Set(), state })).toBeNull();
    expect(
      decideScheduledPush({ localHour: 9, prefs: { ...prefs, dailyResults: false }, sent: new Set(), state: { ...state, participatedYesterday: true } }),
    ).toEqual({ kind: "morning", category: "daily_challenge", variant: "live" });
  });

  it("reminds in the evening only if you haven't entered and there's time left", () => {
    expect(decideScheduledPush({ localHour: 19, prefs, sent: new Set(["morning"]), state })).toEqual({ kind: "evening", category: "daily_challenge", variant: "reminder" });
    expect(decideScheduledPush({ localHour: 19, prefs, sent: new Set(["morning"]), state: { ...state, minutesLeft: 20 } })).toBeNull();
    expect(decideScheduledPush({ localHour: 19, prefs, sent: new Set(["morning", "evening"]), state })).toBeNull();
  });

  it("nudges Rate the Ride in the evening instead when you've already entered", () => {
    const entered = { ...state, enteredToday: true };
    expect(decideScheduledPush({ localHour: 19, prefs, sent: new Set(["morning"]), state: entered })).toEqual({ kind: "evening", category: "rate_ride", variant: "rides" });
    expect(decideScheduledPush({ localHour: 19, prefs, sent: new Set(["morning"]), state: { ...entered, ratedRidesToday: true } })).toBeNull();
    expect(decideScheduledPush({ localHour: 19, prefs, sent: new Set(["morning"]), state: { ...entered, ridesAvailable: false } })).toBeNull();
  });

  it("never sends during quiet hours", () => {
    expect(decideScheduledPush({ localHour: 19, prefs: { ...prefs, quietStart: 18 }, sent: new Set(["morning"]), state })).toBeNull();
  });
});

describe("mayNotifyVote", () => {
  const now = new Date("2026-11-08T18:00:00Z");
  it("allows the first vote alert of the day", () => {
    expect(mayNotifyVote({ prefs, localHour: 12, sentTodayAt: [], now })).toBe(true);
  });
  it("waits three hours between vote alerts and caps them at three a day", () => {
    expect(mayNotifyVote({ prefs, localHour: 12, sentTodayAt: [new Date("2026-11-08T16:00:00Z")], now })).toBe(false);
    expect(mayNotifyVote({ prefs, localHour: 12, sentTodayAt: [new Date("2026-11-08T14:00:00Z")], now })).toBe(true);
    const three = [new Date("2026-11-08T08:00:00Z"), new Date("2026-11-08T11:00:00Z"), new Date("2026-11-08T14:00:00Z")];
    expect(mayNotifyVote({ prefs, localHour: 12, sentTodayAt: three, now })).toBe(false);
  });
  it("respects quiet hours and the switch", () => {
    expect(mayNotifyVote({ prefs, localHour: 23, sentTodayAt: [], now })).toBe(false);
    expect(mayNotifyVote({ prefs: { ...prefs, dailyVotes: false }, localHour: 12, sentTodayAt: [], now })).toBe(false);
  });
});
