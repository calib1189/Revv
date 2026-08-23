import { describe, expect, it } from "vitest";
import { validateBio } from "./profile";

describe("validateBio", () => {
  it("allows an empty bio", () => {
    expect(validateBio("")).toBeNull();
  });

  it("allows a normal bio", () => {
    expect(validateBio("Building a 2JZ Supra, slowly.")).toBeNull();
  });

  it("rejects bios over 300 characters", () => {
    expect(validateBio("a".repeat(301))).toMatch(/300/);
  });

  it("accepts exactly 300 characters", () => {
    expect(validateBio("a".repeat(300))).toBeNull();
  });
});
