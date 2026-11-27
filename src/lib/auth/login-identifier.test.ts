import { describe, expect, it } from "vitest";
import { parseLoginIdentifier } from "./login-identifier";

describe("parseLoginIdentifier", () => {
  it("treats anything with an @ in the middle as an email", () => {
    expect(parseLoginIdentifier(" Calib@Example.com ")).toEqual({ kind: "email", value: "Calib@Example.com" });
  });

  it("treats a username as a username, case and a leading @ don't matter", () => {
    expect(parseLoginIdentifier("scopedtm")).toEqual({ kind: "username", value: "scopedtm" });
    expect(parseLoginIdentifier("@ScopedTM")).toEqual({ kind: "username", value: "scopedtm" });
  });

  it("rejects something that's neither", () => {
    expect(parseLoginIdentifier("")).toEqual({ kind: "invalid" });
    expect(parseLoginIdentifier("no spaces allowed")).toEqual({ kind: "invalid" });
    expect(parseLoginIdentifier("ab")).toEqual({ kind: "invalid" });
  });
});
