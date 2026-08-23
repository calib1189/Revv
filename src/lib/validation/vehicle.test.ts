import { describe, expect, it } from "vitest";
import { validateVehicleForm } from "./vehicle";

const NOW = new Date("2026-08-22T00:00:00Z");
const valid = { year: "2020", make: "Toyota", model: "Supra", mileage: "12000" };

describe("validateVehicleForm", () => {
  it("passes for a fully valid entry", () => {
    expect(validateVehicleForm(valid, NOW)).toEqual({});
  });

  it("requires make and model", () => {
    const errors = validateVehicleForm({ ...valid, make: "", model: "  " }, NOW);
    expect(errors.make).toMatch(/required/i);
    expect(errors.model).toMatch(/required/i);
  });

  it("requires a year", () => {
    expect(validateVehicleForm({ ...valid, year: "" }, NOW).year).toMatch(
      /required/i,
    );
  });

  it("rejects a year before 1900", () => {
    expect(validateVehicleForm({ ...valid, year: "1899" }, NOW).year).toMatch(
      /between/,
    );
  });

  it("allows next model year but rejects two years out", () => {
    expect(validateVehicleForm({ ...valid, year: "2027" }, NOW).year).toBeUndefined();
    expect(validateVehicleForm({ ...valid, year: "2028" }, NOW).year).toMatch(
      /between/,
    );
  });

  it("rejects negative mileage", () => {
    expect(
      validateVehicleForm({ ...valid, mileage: "-5" }, NOW).mileage,
    ).toMatch(/positive/);
  });

  it("allows empty mileage since it's optional", () => {
    expect(validateVehicleForm({ ...valid, mileage: "" }, NOW).mileage).toBeUndefined();
  });
});
