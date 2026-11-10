import { describe, expect, it } from "vitest";
import { normalizeCaption, normalizeChallengeText, normalizeSponsor } from "./validation";

describe("normalizeCaption", () => {
  it("trims, collapses spaces and nulls blanks", () => {
    expect(normalizeCaption("  Fresh   wash, new wheels  ")).toEqual({ value: "Fresh wash, new wheels" });
    expect(normalizeCaption("   ")).toEqual({ value: null });
  });
  it("rejects captions over 150 characters", () => {
    expect(normalizeCaption("x".repeat(151))).toHaveProperty("error");
    expect(normalizeCaption("x".repeat(150))).toEqual({ value: "x".repeat(150) });
  });
});

describe("normalizeChallengeText", () => {
  it("requires a title and description within limits", () => {
    expect(normalizeChallengeText({ title: " Best Stance ", description: " Get low. " })).toEqual({
      value: { title: "Best Stance", description: "Get low." },
    });
    expect(normalizeChallengeText({ title: "", description: "x" })).toHaveProperty("error");
    expect(normalizeChallengeText({ title: "x", description: "" })).toHaveProperty("error");
    expect(normalizeChallengeText({ title: "x".repeat(61), description: "x" })).toHaveProperty("error");
    expect(normalizeChallengeText({ title: "x", description: "x".repeat(281) })).toHaveProperty("error");
  });
});

describe("normalizeSponsor", () => {
  const empty = { name: "", url: "", logoMediaId: null, prize: "" };

  it("treats an all-blank sponsor as no sponsor", () => {
    expect(normalizeSponsor(empty)).toEqual({ value: { name: null, url: null, logoMediaId: null, prize: null } });
  });

  it("keeps a full sponsor, trimmed", () => {
    expect(
      normalizeSponsor({ name: "  Lone Star  Detailing ", url: " https://lonestardetail.com ", logoMediaId: "m1", prize: " Free ceramic coat " }),
    ).toEqual({ value: { name: "Lone Star Detailing", url: "https://lonestardetail.com", logoMediaId: "m1", prize: "Free ceramic coat" } });
  });

  it("allows a prize with no sponsor, for SORZA's own prize days", () => {
    expect(normalizeSponsor({ ...empty, prize: "SORZA shirt" })).toEqual({
      value: { name: null, url: null, logoMediaId: null, prize: "SORZA shirt" },
    });
  });

  it("needs a name before a link or logo", () => {
    expect(normalizeSponsor({ ...empty, url: "https://x.com" })).toHaveProperty("error");
    expect(normalizeSponsor({ ...empty, logoMediaId: "m1" })).toHaveProperty("error");
  });

  it("accepts only https links and adds https:// to a bare domain", () => {
    expect(normalizeSponsor({ ...empty, name: "A", url: "http://x.com" })).toHaveProperty("error");
    expect(normalizeSponsor({ ...empty, name: "A", url: "javascript:alert(1)" })).toHaveProperty("error");
    expect(normalizeSponsor({ ...empty, name: "A", url: "lonestardetail.com/shop" })).toEqual({
      value: { name: "A", url: "https://lonestardetail.com/shop", logoMediaId: null, prize: null },
    });
  });

  it("enforces the length limits", () => {
    expect(normalizeSponsor({ ...empty, name: "x".repeat(61) })).toHaveProperty("error");
    expect(normalizeSponsor({ ...empty, prize: "x".repeat(121) })).toHaveProperty("error");
  });
});
