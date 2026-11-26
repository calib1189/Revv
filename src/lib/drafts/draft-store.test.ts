import { describe, expect, it } from "vitest";
import { draftErrorMessage, sortDrafts, type PostDraft } from "./draft-store";

function draft(id: string, updatedAt: number): PostDraft {
  return {
    id,
    userId: "u",
    createdAt: 0,
    updatedAt,
    kind: "photo",
    cover: null,
    caption: "",
    vehicleId: "",
    crewId: "",
    sound: null,
    soundStartMs: 0,
  };
}

describe("sortDrafts", () => {
  it("puts the most recently saved draft first", () => {
    const sorted = sortDrafts([draft("a", 10), draft("b", 30), draft("c", 20)]);
    expect(sorted.map((d) => d.id)).toEqual(["b", "c", "a"]);
  });
});

describe("draftErrorMessage", () => {
  it("says when the phone is out of space", () => {
    expect(draftErrorMessage(new DOMException("full", "QuotaExceededError"))).toMatch(/out of space/);
  });
  it("falls back to a plain retry message", () => {
    expect(draftErrorMessage(new Error("boom"))).toBe("Couldn't save your draft. Try again.");
  });
});
