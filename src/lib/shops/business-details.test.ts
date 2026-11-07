import { describe, expect, it } from "vitest";
import { normalizeInstagram, normalizePhone, normalizeServices, normalizeTagline, normalizeWebsite } from "./business-details";

describe("normalizeServices", () => {
  it("trims, drops blanks and case-insensitive duplicates", () => {
    expect(normalizeServices(["  Tint ", "", "tint", "Exhaust"])).toEqual({ value: ["Tint", "Exhaust"] });
  });
  it("rejects too many or too long", () => {
    expect(normalizeServices(Array.from({ length: 13 }, (_, i) => `S${i}`))).toHaveProperty("error");
    expect(normalizeServices(["x".repeat(41)])).toHaveProperty("error");
  });
});

describe("normalizePhone", () => {
  it("allows common formats and blanks", () => {
    expect(normalizePhone(" (985) 555-0142 ")).toEqual({ value: "(985) 555-0142" });
    expect(normalizePhone("+1 985 555 0142")).toEqual({ value: "+1 985 555 0142" });
    expect(normalizePhone("  ")).toEqual({ value: null });
  });
  it("rejects letters and too few digits", () => {
    expect(normalizePhone("call me")).toHaveProperty("error");
    expect(normalizePhone("555-01")).toHaveProperty("error");
  });
});

describe("normalizeWebsite", () => {
  it("adds https and keeps http(s)", () => {
    expect(normalizeWebsite("myshop.com")).toEqual({ value: "https://myshop.com" });
    expect(normalizeWebsite("http://myshop.com/x")).toEqual({ value: "http://myshop.com/x" });
    expect(normalizeWebsite("")).toEqual({ value: null });
  });
  it("rejects things that aren't web addresses", () => {
    expect(normalizeWebsite("javascript:alert(1)")).toHaveProperty("error");
    expect(normalizeWebsite("not a site")).toHaveProperty("error");
    expect(normalizeWebsite(`https://${"a".repeat(200)}.com`)).toHaveProperty("error");
  });
});

describe("normalizeInstagram", () => {
  it("accepts handles, @handles and profile links", () => {
    expect(normalizeInstagram("@tangi.cars")).toEqual({ value: "tangi.cars" });
    expect(normalizeInstagram("https://www.instagram.com/tangi_cars/")).toEqual({ value: "tangi_cars" });
    expect(normalizeInstagram("")).toEqual({ value: null });
  });
  it("rejects invalid handles", () => {
    expect(normalizeInstagram("bad handle!")).toHaveProperty("error");
  });
});

describe("normalizeTagline", () => {
  it("trims and limits length", () => {
    expect(normalizeTagline("  Custom exhaust since 2009 ")).toEqual({ value: "Custom exhaust since 2009" });
    expect(normalizeTagline("")).toEqual({ value: null });
    expect(normalizeTagline("x".repeat(81))).toHaveProperty("error");
  });
});
