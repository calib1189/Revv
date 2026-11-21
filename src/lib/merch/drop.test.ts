import { describe, expect, it } from "vitest";
import { dropLogDay, dropPushPayload, formatDropCountdown } from "@/lib/merch/drop";
import { teeById } from "@/lib/merch/products";

const S = 1000;
const M = 60 * S;
const H = 60 * M;
const D = 24 * H;

describe("formatDropCountdown", () => {
  it("shows days, hours, minutes and seconds while a day or more is left", () => {
    expect(formatDropCountdown(2 * D + 14 * H + 3 * M + 12 * S)).toBe("2d 14h 03m 12s");
    expect(formatDropCountdown(1 * D)).toBe("1d 00h 00m 00s");
  });

  it("drops to a clock on the last day", () => {
    expect(formatDropCountdown(14 * H + 3 * M + 9 * S)).toBe("14:03:09");
    expect(formatDropCountdown(59 * S)).toBe("00:00:59");
  });

  it("rounds a part-second down and never goes negative", () => {
    expect(formatDropCountdown(1999)).toBe("00:00:01");
    expect(formatDropCountdown(0)).toBe("00:00:00");
    expect(formatDropCountdown(-5 * S)).toBe("00:00:00");
  });
});

describe("the drop push", () => {
  const drop = teeById("sunset")!;

  it("is named for the drop, says when it ends, and opens its sheet", () => {
    expect(dropPushPayload(drop)).toEqual({
      title: "Limited Vice City Tee",
      body: "The Limited Vice City Tee just dropped. It's gone after Sun, Dec 6, so grab yours.",
      url: "/store?tee=sunset",
    });
  });

  it("logs once per person per drop, keyed by the drop's end date", () => {
    expect(dropLogDay(drop)).toBe("2026-12-07");
  });
});
