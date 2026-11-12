import { describe, expect, it } from "vitest";
import { formatWait, nextFreeRateAt } from "@/lib/rating/rerate";

const now = new Date("2026-11-12T12:00:00Z");

describe("nextFreeRateAt", () => {
  it("is null when the car has never been rated or the 24 hours are up", () => {
    expect(nextFreeRateAt(null, now)).toBeNull();
    expect(nextFreeRateAt("2026-11-11T12:00:00Z", now)).toBeNull();
    expect(nextFreeRateAt("2026-11-10T08:00:00Z", now)).toBeNull();
  });

  it("is 24 hours after the last attempt while that's still ahead", () => {
    expect(nextFreeRateAt("2026-11-12T07:00:00Z", now)?.toISOString()).toBe("2026-11-13T07:00:00.000Z");
    expect(nextFreeRateAt("2026-11-11T12:00:01Z", now)?.toISOString()).toBe("2026-11-12T12:00:01.000Z");
  });
});

describe("formatWait", () => {
  it("rounds hours up, and switches to minutes under an hour", () => {
    expect(formatWait(new Date("2026-11-13T07:00:00Z"), now)).toBe("19h");
    expect(formatWait(new Date("2026-11-12T13:00:00Z"), now)).toBe("1h");
    expect(formatWait(new Date("2026-11-12T12:59:00Z"), now)).toBe("59m");
    expect(formatWait(new Date("2026-11-12T12:00:10Z"), now)).toBe("1m");
  });
});
