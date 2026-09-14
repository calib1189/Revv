import { describe, expect, it } from "vitest";
import { validateBusinessDescription } from "./business-profile";

describe("validateBusinessDescription", () => {
  it("passes for an empty description", () => {
    expect(validateBusinessDescription("")).toBeNull();
  });

  it("passes for a normal description", () => {
    expect(validateBusinessDescription("Family-owned tint and detailing shop since 2004.")).toBeNull();
  });

  it("rejects a description over 500 characters", () => {
    expect(validateBusinessDescription("A".repeat(501))).toMatch(/500 characters/i);
  });

  it("accepts a description exactly at 500 characters", () => {
    expect(validateBusinessDescription("A".repeat(500))).toBeNull();
  });
});
