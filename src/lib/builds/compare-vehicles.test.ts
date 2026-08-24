import { describe, expect, it } from "vitest";
import { compareVehicles } from "./compare-vehicles";
import type { Vehicle } from "@/lib/db/vehicles";

function makeVehicle(overrides: Partial<Vehicle>): Vehicle {
  return {
    id: "v1",
    owner_id: "u1",
    year: 1998,
    make: "Toyota",
    model: "Supra",
    trim: null,
    engine: null,
    drivetrain: "RWD",
    color: null,
    mileage: null,
    nickname: null,
    description: null,
    hero_media_id: null,
    category: "cars",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("compareVehicles", () => {
  it("flags no differences for the same make/model/drivetrain", () => {
    const a = makeVehicle({});
    const b = makeVehicle({ id: "v2", year: 1999 });
    const result = compareVehicles(a, b);
    expect(result.sameMakeModel).toBe(true);
    expect(result.differences).toEqual([]);
  });

  it("flags a different make/model", () => {
    const a = makeVehicle({});
    const b = makeVehicle({ id: "v2", make: "Subaru", model: "WRX STI" });
    const result = compareVehicles(a, b);
    expect(result.sameMakeModel).toBe(false);
    expect(result.differences[0]).toMatch(/Different vehicle/);
  });

  it("flags a drivetrain difference even with the same make/model", () => {
    const a = makeVehicle({ drivetrain: "RWD" });
    const b = makeVehicle({ id: "v2", drivetrain: "AWD" });
    const result = compareVehicles(a, b);
    expect(result.sameMakeModel).toBe(true);
    expect(result.differences[0]).toMatch(/Drivetrain differs/);
  });

  it("does not flag drivetrain when either side is unknown", () => {
    const a = makeVehicle({ drivetrain: null });
    const b = makeVehicle({ id: "v2", drivetrain: "AWD" });
    expect(compareVehicles(a, b).differences).toEqual([]);
  });
});
