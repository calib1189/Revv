import { describe, expect, it } from "vitest";
import { validateBuildPartForm, dollarsToCents } from "./build-part";

const valid = { rawName: "Apex EC-7 18x9.5 +35", price: "1200.50", installCost: "150" };

describe("validateBuildPartForm", () => {
  it("passes for a fully valid entry", () => {
    const errors = validateBuildPartForm(valid);
    expect(errors.rawName).toBeUndefined();
    expect(errors.price).toBeUndefined();
    expect(errors.installCost).toBeUndefined();
  });

  it("requires a name", () => {
    expect(validateBuildPartForm({ ...valid, rawName: "  " }).rawName).toMatch(
      /required/i,
    );
  });

  it("rejects names over 200 characters", () => {
    expect(
      validateBuildPartForm({ ...valid, rawName: "a".repeat(201) }).rawName,
    ).toMatch(/200/);
  });

  it("rejects a negative price", () => {
    expect(validateBuildPartForm({ ...valid, price: "-5" }).price).toMatch(
      /positive/,
    );
  });

  it("allows empty price and install cost since they're optional", () => {
    const errors = validateBuildPartForm({ ...valid, price: "", installCost: "" });
    expect(errors.price).toBeUndefined();
    expect(errors.installCost).toBeUndefined();
  });

  it("accepts a price typed with a leading dollar sign", () => {
    expect(validateBuildPartForm({ ...valid, price: "$500" }).price).toBeUndefined();
  });

  it("accepts a price typed with thousands commas", () => {
    expect(validateBuildPartForm({ ...valid, price: "$1,500.50" }).price).toBeUndefined();
  });
});

describe("dollarsToCents", () => {
  it("converts dollars to integer cents", () => {
    expect(dollarsToCents("12.50")).toBe(1250);
  });

  it("rounds fractional cents", () => {
    expect(dollarsToCents("12.505")).toBe(1251);
  });

  it("returns null for empty input", () => {
    expect(dollarsToCents("")).toBeNull();
  });

  it("returns 0 for zero", () => {
    expect(dollarsToCents("0")).toBe(0);
  });

  it("strips a leading dollar sign", () => {
    expect(dollarsToCents("$500")).toBe(50000);
  });

  it("strips thousands commas", () => {
    expect(dollarsToCents("$1,500.50")).toBe(150050);
  });
});
