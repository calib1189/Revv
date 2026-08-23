import { describe, expect, it } from "vitest";
import { validateMessageBody } from "./message";

describe("validateMessageBody", () => {
  it("accepts a normal message", () => {
    expect(validateMessageBody("Hey, nice build!")).toBeNull();
  });

  it("rejects empty or whitespace-only input", () => {
    expect(validateMessageBody("")).toMatch(/empty/);
    expect(validateMessageBody("   ")).toMatch(/empty/);
  });

  it("rejects messages over 4000 characters", () => {
    expect(validateMessageBody("a".repeat(4001))).toMatch(/4000/);
  });

  it("accepts exactly 4000 characters", () => {
    expect(validateMessageBody("a".repeat(4000))).toBeNull();
  });
});
