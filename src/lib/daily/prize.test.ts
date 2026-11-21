import { describe, expect, it } from "vitest";
import { DAILY_POINTS } from "@/lib/points/values";
import { boostedPushCopy, isBoostedDay, parseWinnerPoints, winnerPoints, winnerTakes } from "@/lib/daily/prize";

const usual = DAILY_POINTS.place[1];

describe("winner points", () => {
  it("pays the usual amount unless the day sets its own", () => {
    expect(winnerPoints({ winner_points: null })).toBe(usual);
    expect(winnerPoints({})).toBe(usual);
    expect(winnerPoints({ winner_points: 250 })).toBe(250);
  });

  it("calls a day boosted only when it pays more than usual", () => {
    expect(isBoostedDay({ winner_points: 250 })).toBe(true);
    expect(isBoostedDay({ winner_points: null })).toBe(false);
    expect(isBoostedDay({ winner_points: usual - 1 })).toBe(false);
  });

  it("says what the winner takes", () => {
    expect(winnerTakes({ winner_points: 250 })).toBe("250 points");
    expect(winnerTakes({ winner_points: 1500, prize: "a $50 gift card" })).toBe("a $50 gift card plus 1,500 points");
  });

  it("reads the admin's field", () => {
    expect(parseWinnerPoints("")).toEqual({ value: null });
    expect(parseWinnerPoints(" 250 ")).toEqual({ value: 250 });
    expect(parseWinnerPoints("1,000")).toEqual({ value: 1000 });
    expect(parseWinnerPoints(String(usual))).toEqual({ value: null });
    expect(parseWinnerPoints("0")).toHaveProperty("error");
    expect(parseWinnerPoints("12.5")).toHaveProperty("error");
    expect(parseWinnerPoints("-5")).toHaveProperty("error");
    expect(parseWinnerPoints("10001")).toHaveProperty("error");
  });

  it("leads the day's pushes with the points, only on a boosted day", () => {
    const day = { title: "Cleanest Engine Bay", winner_points: 250 };
    expect(boostedPushCopy("live", day)).toEqual({
      title: "250 points up for grabs today",
      body: "Today's Sorza Daily is Cleanest Engine Bay. Enter your car now, get the votes, and take 250 points.",
    });
    expect(boostedPushCopy("reminder", day)?.title).toBe("Last call for 250 points");
    expect(boostedPushCopy("results", { ...day, sponsor_name: "Lone Star Detailing", prize: "a free detail" })?.body).toBe(
      "Yesterday's winner is crowned. Today it's Cleanest Engine Bay, presented by Lone Star Detailing, and the winner takes a free detail plus 250 points. Enter now.",
    );
    expect(boostedPushCopy("live", { title: "Any", winner_points: null })).toBeNull();
  });
});
