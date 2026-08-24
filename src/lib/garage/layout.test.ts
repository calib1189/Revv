import { describe, expect, it } from "vitest";
import { parseGarageLayout, validateGarageLayout, DEFAULT_GARAGE_LAYOUT } from "./layout";

describe("parseGarageLayout", () => {
  it("defaults an empty object (the fresh-profile state)", () => {
    expect(parseGarageLayout({})).toEqual(DEFAULT_GARAGE_LAYOUT);
  });

  it("defaults non-object input", () => {
    expect(parseGarageLayout(null)).toEqual(DEFAULT_GARAGE_LAYOUT);
    expect(parseGarageLayout(undefined)).toEqual(DEFAULT_GARAGE_LAYOUT);
  });

  it("resizes bays to match the template's bay count", () => {
    const result = parseGarageLayout({ template: "three-bay", bays: ["a", "b"] });
    expect(result.bays).toEqual(["a", "b", null]);
  });

  it("drops a stray field instead of failing the whole parse", () => {
    const result = parseGarageLayout({ template: "single", wallArt: "not-a-real-option" });
    expect(result.wallArt).toBe("none");
  });

  it("keeps a fully valid layout as-is", () => {
    const layout = {
      template: "two-bay",
      bays: ["v1", null],
      wallArt: "neon",
      plant: "fern",
      rug: "checker",
      lighting: "cool",
    };
    expect(parseGarageLayout(layout)).toEqual(layout);
  });
});

describe("validateGarageLayout", () => {
  it("accepts a well-formed layout", () => {
    const layout = {
      template: "single",
      bays: ["v1"],
      wallArt: "none",
      plant: "none",
      rug: "none",
      lighting: "warm",
    };
    expect(validateGarageLayout(layout)).toEqual(layout);
  });

  it("rejects a bay count mismatched with the template", () => {
    expect(
      validateGarageLayout({
        template: "single",
        bays: ["v1", "v2"],
        wallArt: "none",
        plant: "none",
        rug: "none",
        lighting: "warm",
      }),
    ).toBeNull();
  });

  it("rejects an unknown decor option", () => {
    expect(
      validateGarageLayout({
        template: "single",
        bays: [null],
        wallArt: "holographic",
        plant: "none",
        rug: "none",
        lighting: "warm",
      }),
    ).toBeNull();
  });

  it("rejects non-object input", () => {
    expect(validateGarageLayout(null)).toBeNull();
    expect(validateGarageLayout("garage")).toBeNull();
  });
});
