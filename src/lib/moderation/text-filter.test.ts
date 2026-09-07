import { describe, expect, it } from "vitest";
import { findObjectionableTerm } from "./text-filter";

describe("findObjectionableTerm", () => {
  it("returns null for clean text", () => {
    expect(findObjectionableTerm("New wheels finally on the S15.")).toBeNull();
    expect(findObjectionableTerm("")).toBeNull();
  });

  it("catches a blocked phrase case-insensitively", () => {
    expect(findObjectionableTerm("kill YOURSELF")).toBe("kill yourself");
  });

  it("catches a short blocked term as a standalone word", () => {
    expect(findObjectionableTerm("just kys already")).toBe("kys");
  });

  it("does not flag an ordinary word that happens to contain a blocked term as a substring", () => {
    expect(findObjectionableTerm("that stance looks conspicuous")).toBeNull();
    expect(findObjectionableTerm("a despicable parking job")).toBeNull();
  });
});
