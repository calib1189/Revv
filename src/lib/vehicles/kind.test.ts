import { describe, expect, it } from "vitest";
import { vehicleKind } from "./category";
import { subscoreLabels } from "@/lib/rating/subscore-labels";

describe("vehicleKind", () => {
  it("knows bikes, trucks and everything else", () => {
    expect(vehicleKind("street_bikes")).toBe("bike");
    expect(vehicleKind("cruisers_choppers")).toBe("bike");
    expect(vehicleKind("trucks_offroad")).toBe("truck");
    expect(vehicleKind("jdm")).toBe("car");
    expect(vehicleKind(null)).toBe("car");
  });
});

describe("subscoreLabels", () => {
  it("calls a bike's interior its cockpit, and changes nothing else", () => {
    const car = subscoreLabels("car");
    const bike = subscoreLabels("bike");
    expect(car.interior).toBe("Interior");
    expect(bike.interior).toBe("Cockpit");
    expect(subscoreLabels("truck")).toEqual(car);
    expect({ ...bike, interior: car.interior }).toEqual(car);
  });
});
