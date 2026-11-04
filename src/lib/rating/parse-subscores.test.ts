import { describe, expect, it } from "vitest";
import { parseSubscores } from "./parse-subscores";

describe("parseSubscores", () => {
  it("reads a complete breakdown", () => {
    const value = { appearance: 94, performance: 90, wheelsFitment: 85, interior: 88, modifications: 93 };
    expect(parseSubscores(value)).toEqual(value);
  });

  it("rejects a partial or malformed breakdown", () => {
    expect(parseSubscores({ appearance: 94, performance: 90 })).toBeNull();
    expect(parseSubscores({ appearance: "94", performance: 90, wheelsFitment: 85, interior: 88, modifications: 93 })).toBeNull();
    expect(parseSubscores([94, 90, 85, 88, 93])).toBeNull();
    expect(parseSubscores(null)).toBeNull();
    expect(parseSubscores("94")).toBeNull();
  });
});
