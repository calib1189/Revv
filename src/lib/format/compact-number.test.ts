import { describe, expect, it } from "vitest";
import { formatCompactNumber } from "./compact-number";

describe("formatCompactNumber", () => {
  it("shows small numbers as-is", () => {
    expect(formatCompactNumber(0)).toBe("0");
    expect(formatCompactNumber(950)).toBe("950");
  });

  it("formats thousands with one decimal under 10K", () => {
    expect(formatCompactNumber(1200)).toBe("1.2K");
    expect(formatCompactNumber(9950)).toBe("10K"); // rounds up cleanly, no floating-point drift
  });

  it("drops the decimal at 10K and above", () => {
    expect(formatCompactNumber(13100)).toBe("13K");
    expect(formatCompactNumber(999_000)).toBe("999K");
  });

  it("formats millions", () => {
    expect(formatCompactNumber(1_200_000)).toBe("1.2M");
    expect(formatCompactNumber(15_000_000)).toBe("15M");
  });

  it("drops a trailing .0", () => {
    expect(formatCompactNumber(2000)).toBe("2K");
    expect(formatCompactNumber(2_000_000)).toBe("2M");
  });
});
