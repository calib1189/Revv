import { describe, expect, it } from "vitest";
import { isUuid } from "./uuid";

describe("isUuid", () => {
  it("accepts a real id and rejects anything else", () => {
    expect(isUuid("4408f737-3aa2-4641-a234-f00f75331feb")).toBe(true);
    expect(isUuid("4408F737-3AA2-4641-A234-F00F75331FEB")).toBe(true);
    for (const bad of ["", "abc", "4408f737-3aa2-4641-a234-f00f75331fe", "4408f737-3aa2-4641-a234-f00f75331feb'--", null, 42]) {
      expect(isUuid(bad)).toBe(false);
    }
  });
});
