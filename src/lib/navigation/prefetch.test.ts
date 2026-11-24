import { describe, expect, it } from "vitest";
import { prefetchAllowed, shouldPrefetch } from "./prefetch";

describe("prefetchAllowed", () => {
  it("preloads on a normal connection, or when the browser doesn't say", () => {
    expect(prefetchAllowed(undefined)).toBe(true);
    expect(prefetchAllowed({ effectiveType: "4g" })).toBe(true);
  });
  it("holds off on Low Data Mode and 2G", () => {
    expect(prefetchAllowed({ saveData: true, effectiveType: "4g" })).toBe(false);
    expect(prefetchAllowed({ effectiveType: "2g" })).toBe(false);
    expect(prefetchAllowed({ effectiveType: "slow-2g" })).toBe(false);
  });
});

describe("shouldPrefetch", () => {
  it("preloads a page once, then not again for a minute", () => {
    const seen = new Map<string, number>();
    expect(shouldPrefetch("/u/a", 0, seen)).toBe(true);
    expect(shouldPrefetch("/u/a", 30_000, seen)).toBe(false);
    expect(shouldPrefetch("/u/b", 30_000, seen)).toBe(true);
    expect(shouldPrefetch("/u/a", 61_000, seen)).toBe(true);
  });
});
