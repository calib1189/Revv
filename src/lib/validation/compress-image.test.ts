import { describe, it, expect } from "vitest";
import { needsNormalizing } from "./compress-image";

const MB = 1024 * 1024;

describe("needsNormalizing", () => {
  it("leaves a small JPEG, PNG, or WebP alone", () => {
    expect(needsNormalizing({ type: "image/jpeg", size: 1 * MB }, 15 * MB)).toBe(false);
    expect(needsNormalizing({ type: "image/png", size: 3 * MB }, 15 * MB)).toBe(false);
    expect(needsNormalizing({ type: "image/webp", size: 3 * MB }, 15 * MB)).toBe(false);
  });

  it("shrinks a photo over the server request limit even though it's under the 15MB cap", () => {
    // The original bug: a 6MB iPhone photo passed the 15MB check, then
    // the server refused the request body.
    expect(needsNormalizing({ type: "image/jpeg", size: 6 * MB }, 15 * MB)).toBe(true);
    expect(needsNormalizing({ type: "image/jpeg", size: 4 * MB }, 15 * MB)).toBe(true);
  });

  it("converts formats the app doesn't store, at any size", () => {
    expect(needsNormalizing({ type: "image/heic", size: 100 }, 15 * MB)).toBe(true);
    expect(needsNormalizing({ type: "image/heif", size: 100 }, 15 * MB)).toBe(true);
    expect(needsNormalizing({ type: "image/gif", size: 100 }, 15 * MB)).toBe(true);
    expect(needsNormalizing({ type: "image/avif", size: 100 }, 15 * MB)).toBe(true);
  });

  it("converts a file whose type the browser couldn't identify", () => {
    // iOS sometimes hands over a HEIC with an empty type.
    expect(needsNormalizing({ type: "", size: 2 * MB }, 15 * MB)).toBe(true);
  });

  it("honors a caller's own tighter limit", () => {
    expect(needsNormalizing({ type: "image/jpeg", size: 3 * MB }, 2 * MB)).toBe(true);
  });
});
