import { describe, expect, it } from "vitest";
import { validateCaption, validatePhotoCount } from "./post";

describe("validateCaption", () => {
  it("allows an empty caption", () => {
    expect(validateCaption("")).toBeNull();
  });

  it("allows a normal caption", () => {
    expect(validateCaption("New wheels finally on.")).toBeNull();
  });

  it("rejects captions over 2200 characters", () => {
    expect(validateCaption("a".repeat(2201))).toMatch(/2200/);
  });
});

describe("validatePhotoCount", () => {
  it("requires at least one photo", () => {
    expect(validatePhotoCount(0)).toMatch(/at least one/);
  });

  it("allows up to 10 photos", () => {
    expect(validatePhotoCount(10)).toBeNull();
  });

  it("rejects more than 10 photos", () => {
    expect(validatePhotoCount(11)).toMatch(/up to 10/);
  });
});
