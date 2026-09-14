import { describe, expect, it } from "vitest";
import { validateSoundForm } from "./sound";

const valid = { title: "Late Night Cruise", artistName: "SORZA Originals" };

describe("validateSoundForm", () => {
  it("passes for a fully valid entry", () => {
    expect(validateSoundForm(valid)).toEqual({});
  });

  it("passes with no artist name", () => {
    expect(validateSoundForm({ ...valid, artistName: "" })).toEqual({});
  });

  it("rejects an empty title", () => {
    expect(validateSoundForm({ ...valid, title: "" }).title).toMatch(/name/i);
  });

  it("rejects a title that's only whitespace", () => {
    expect(validateSoundForm({ ...valid, title: "   " }).title).toMatch(/name/i);
  });

  it("rejects a title over 80 characters", () => {
    expect(validateSoundForm({ ...valid, title: "A".repeat(81) }).title).toMatch(/80 characters/i);
  });

  it("accepts a title exactly at 80 characters", () => {
    expect(validateSoundForm({ ...valid, title: "A".repeat(80) }).title).toBeUndefined();
  });

  it("rejects an artist name over 80 characters", () => {
    expect(validateSoundForm({ ...valid, artistName: "A".repeat(81) }).artistName).toMatch(
      /80 characters/i,
    );
  });
});
