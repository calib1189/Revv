import { describe, expect, it } from "vitest";
import { isOnMainBoard, vehicleKind } from "./category";
import { subscoreLabels } from "@/lib/rating/subscore-labels";

describe("vehicleKind", () => {
  it("knows bikes, trucks and everything else", () => {
    expect(vehicleKind("street_bikes")).toBe("bike");
    expect(vehicleKind("cruisers_choppers")).toBe("bike");
    expect(vehicleKind("trucks_offroad")).toBe("truck");
    expect(vehicleKind("atv_utv")).toBe("atv");
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
    expect(subscoreLabels("atv").interior).toBe("Cockpit");
    expect({ ...bike, interior: car.interior }).toEqual(car);
  });
});

describe("isOnMainBoard", () => {
  it("keeps ATVs and UTVs off the main board and everything else on it", () => {
    expect(isOnMainBoard("atv_utv")).toBe(false);
    expect(isOnMainBoard("muscle_pony")).toBe(true);
    expect(isOnMainBoard("trucks_offroad")).toBe(true);
    expect(isOnMainBoard("street_bikes")).toBe(true);
    expect(isOnMainBoard(null)).toBe(true);
  });
});
