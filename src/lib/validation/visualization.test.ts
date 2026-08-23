import { describe, expect, it } from "vitest";
import { validatePrompt } from "./visualization";

describe("validatePrompt", () => {
  it("accepts a normal prompt", () => {
    expect(validatePrompt("Matte black hood wrap")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(validatePrompt("   ")).toMatch(/describe/i);
  });

  it("rejects prompts over 500 characters", () => {
    expect(validatePrompt("a".repeat(501))).toMatch(/500/);
  });

  it("accepts exactly 500 characters", () => {
    expect(validatePrompt("a".repeat(500))).toBeNull();
  });
});
