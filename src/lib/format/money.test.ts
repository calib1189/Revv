import { describe, expect, it } from "vitest";
import { formatCents } from "./money";

describe("formatCents", () => {
  it("formats whole dollars", () => {
    expect(formatCents(120000)).toBe("$1,200");
  });

  it("rounds to the nearest dollar", () => {
    expect(formatCents(1250)).toBe("$13");
    expect(formatCents(1249)).toBe("$12");
  });

  it("formats zero", () => {
    expect(formatCents(0)).toBe("$0");
  });
});
