import { describe, expect, it } from "vitest";
import { specsToRows, rowsToSpecs } from "./specs";

describe("specsToRows", () => {
  it("converts a specs object into ordered rows", () => {
    expect(specsToRows({ width: "9.5in", offset: "+35mm" })).toEqual([
      { key: "width", value: "9.5in" },
      { key: "offset", value: "+35mm" },
    ]);
  });

  it("stringifies non-string values", () => {
    expect(specsToRows({ count: 4, active: true })).toEqual([
      { key: "count", value: "4" },
      { key: "active", value: "true" },
    ]);
  });

  it("returns an empty array for empty, null, or non-object specs", () => {
    expect(specsToRows({})).toEqual([]);
    expect(specsToRows(null)).toEqual([]);
    expect(specsToRows([1, 2, 3])).toEqual([]);
  });
});

describe("rowsToSpecs", () => {
  it("builds an object from rows, trimming keys and values", () => {
    expect(rowsToSpecs([{ key: " width ", value: " 9.5in " }])).toEqual({
      width: "9.5in",
    });
  });

  it("drops rows with an empty key", () => {
    expect(rowsToSpecs([{ key: "", value: "x" }, { key: "  ", value: "y" }])).toEqual({});
  });

  it("round-trips through specsToRows", () => {
    const original = { width: "9.5in", offset: "+35mm" };
    expect(rowsToSpecs(specsToRows(original))).toEqual(original);
  });
});
