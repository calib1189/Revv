import { describe, expect, it } from "vitest";
import { validateMaintenanceForm } from "./maintenance";

const valid = { kind: "Oil change", performedAt: "2026-06-15", mileage: "45000", cost: "80" };

describe("validateMaintenanceForm", () => {
  it("passes for a fully valid entry", () => {
    expect(validateMaintenanceForm(valid)).toEqual({});
  });

  it("requires a service type", () => {
    expect(validateMaintenanceForm({ ...valid, kind: "  " }).kind).toMatch(
      /required/i,
    );
  });

  it("requires a date", () => {
    expect(
      validateMaintenanceForm({ ...valid, performedAt: "" }).performedAt,
    ).toMatch(/required/i);
  });

  it("rejects negative mileage", () => {
    expect(validateMaintenanceForm({ ...valid, mileage: "-1" }).mileage).toMatch(
      /positive/,
    );
  });

  it("rejects negative cost", () => {
    expect(validateMaintenanceForm({ ...valid, cost: "-1" }).cost).toMatch(
      /positive/,
    );
  });

  it("allows empty mileage and cost since they're optional", () => {
    const errors = validateMaintenanceForm({ ...valid, mileage: "", cost: "" });
    expect(errors.mileage).toBeUndefined();
    expect(errors.cost).toBeUndefined();
  });
});
