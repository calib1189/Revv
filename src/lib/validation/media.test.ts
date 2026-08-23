import { describe, expect, it } from "vitest";
import {
  validateImageFile,
  validateVideoFile,
  validateVideoDuration,
} from "./media";

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

describe("validateVideoFile", () => {
  it("accepts a normal mp4", () => {
    expect(
      validateVideoFile({ type: "video/mp4", size: 20 * 1024 * 1024 }),
    ).toBeNull();
  });

  it("accepts webm and quicktime", () => {
    expect(validateVideoFile({ type: "video/webm", size: 1 })).toBeNull();
    expect(validateVideoFile({ type: "video/quicktime", size: 1 })).toBeNull();
  });

  it("rejects disallowed types", () => {
    expect(validateVideoFile({ type: "image/jpeg", size: 1 })).toMatch(
      /MP4, WebM, or MOV/,
    );
  });

  it("rejects files over the size limit", () => {
    expect(
      validateVideoFile({ type: "video/mp4", size: 101 * 1024 * 1024 }),
    ).toMatch(/100MB/);
  });

  it("accepts a file exactly at the size limit", () => {
    expect(
      validateVideoFile({ type: "video/mp4", size: 100 * 1024 * 1024 }),
    ).toBeNull();
  });
});

describe("validateVideoDuration", () => {
  it("accepts short videos", () => {
    expect(validateVideoDuration(30)).toBeNull();
  });

  it("accepts exactly 3 minutes", () => {
    expect(validateVideoDuration(180)).toBeNull();
  });

  it("rejects videos over 3 minutes", () => {
    expect(validateVideoDuration(181)).toMatch(/3 minutes/);
  });
});
