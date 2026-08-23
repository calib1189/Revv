import { describe, expect, it } from "vitest";
import { validateImageFile } from "./media";

describe("validateImageFile", () => {
  it("accepts a normal jpeg", () => {
    expect(
      validateImageFile({ type: "image/jpeg", size: 2 * 1024 * 1024 }),
    ).toBeNull();
  });

  it("accepts png and webp", () => {
    expect(validateImageFile({ type: "image/png", size: 1 })).toBeNull();
    expect(validateImageFile({ type: "image/webp", size: 1 })).toBeNull();
  });

  it("rejects disallowed types", () => {
    expect(
      validateImageFile({ type: "application/pdf", size: 1 }),
    ).toMatch(/JPEG, PNG, or WebP/);
  });

  it("rejects files over the size limit", () => {
    expect(
      validateImageFile({ type: "image/jpeg", size: 16 * 1024 * 1024 }),
    ).toMatch(/15MB/);
  });

  it("accepts a file exactly at the size limit", () => {
    expect(
      validateImageFile({ type: "image/jpeg", size: 15 * 1024 * 1024 }),
    ).toBeNull();
  });
});
