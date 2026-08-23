import { describe, expect, it } from "vitest";
import { validateUsername } from "./username";

describe("validateUsername", () => {
  it("accepts a valid username", () => {
    expect(validateUsername("turbo_dan_92")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(validateUsername("")).toMatch(/required/i);
  });

  it("rejects uppercase letters", () => {
    expect(validateUsername("TurboDan")).toMatch(/lowercase/i);
  });

  it("rejects usernames shorter than 3 characters", () => {
    expect(validateUsername("ab")).toMatch(/3-24/);
  });

  it("rejects usernames longer than 24 characters", () => {
    expect(validateUsername("a".repeat(25))).toMatch(/3-24/);
  });

  it("rejects disallowed characters", () => {
    expect(validateUsername("turbo-dan")).toMatch(/3-24/);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(validateUsername("  turbo_dan  ")).toBeNull();
  });
});
