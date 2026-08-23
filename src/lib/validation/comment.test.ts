import { describe, expect, it } from "vitest";
import { validateComment } from "./comment";

describe("validateComment", () => {
  it("accepts a normal comment", () => {
    expect(validateComment("Clean build!")).toBeNull();
  });

  it("rejects empty or whitespace-only input", () => {
    expect(validateComment("")).toMatch(/empty/);
    expect(validateComment("   ")).toMatch(/empty/);
  });

  it("rejects comments over 2000 characters", () => {
    expect(validateComment("a".repeat(2001))).toMatch(/2000/);
  });

  it("accepts exactly 2000 characters", () => {
    expect(validateComment("a".repeat(2000))).toBeNull();
  });
});
