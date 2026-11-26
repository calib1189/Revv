import { describe, expect, it } from "vitest";
import { guessVehicleCategory } from "./guess-category";

describe("guessVehicleCategory", () => {
  it("leaves Can-Am's three-wheelers to the owner", () => {
    expect(guessVehicleCategory("Can-Am", "Spyder RT")).toBeNull();
    expect(guessVehicleCategory("Can-Am", "Ryker")).toBeNull();
  });

  it.each([
    ["Toyota", "Supra", "jdm"],
    ["Nissan", "GT-R", "jdm"],
    ["Nissan", "GTR", "jdm"],
    ["Subaru", "WRX STI", "jdm"],
    ["Mazda", "MX-5 Miata", "jdm"],
    ["Ford", "Mustang GT", "muscle_pony"],
    ["Dodge", "Challenger Hellcat", "muscle_pony"],
    ["Chevrolet", "Camaro SS", "muscle_pony"],
    ["Chevrolet", "Corvette Z06", "muscle_pony"],
    ["BMW", "M3 Competition", "euro_performance"],
    ["Audi", "RS3", "euro_performance"],
    ["Porsche", "911 Carrera", "euro_performance"],
    ["Ferrari", "296 GTB", "supercars"],
    ["Lamborghini", "Huracan", "supercars"],
    ["Kawasaki", "Ninja ZX-6R", "street_bikes"],
    ["Harley-Davidson", "Fat Boy", "cruisers_choppers"],
    ["Indian", "Chief", "cruisers_choppers"],
    ["Ford", "F-150 Raptor", "trucks_offroad"],
    ["Chevrolet", "Silverado 1500", "trucks_offroad"],
    ["Toyota", "Tacoma TRD Pro", "trucks_offroad"],
    ["Jeep", "Wrangler Rubicon", "trucks_offroad"],
    ["Ram", "1500", "trucks_offroad"],
    // ATVs and side-by-sides, including the names they share with trucks
    ["Yamaha", "Grizzly 660", "atv_utv"],
    ["Yamaha", "Warrior 350", "atv_utv"],
    ["Yamaha", "Raptor 700R", "atv_utv"],
    ["Honda", "TRX 450R", "atv_utv"],
    ["Honda", "Pioneer 1000", "atv_utv"],
    ["Kawasaki", "Brute Force 750", "atv_utv"],
    ["Suzuki", "KingQuad 750", "atv_utv"],
    ["Polaris", "RZR XP 1000", "atv_utv"],
    ["Polaris", "Ranger 1000", "atv_utv"],
    ["Can-Am", "Commander 1000R", "atv_utv"],
    ["Can-Am", "Defender HD10", "atv_utv"],
    ["Can-Am", "Maverick X3", "atv_utv"],
    ["Arctic Cat", "Alterra 600", "atv_utv"],
    ["CFMOTO", "ZForce 950", "atv_utv"],
    ["Ford", "Ranger XLT", "trucks_offroad"],
    ["Ford", "Maverick", "trucks_offroad"],
    ["Ram", "1500 TRX", "trucks_offroad"],
    ["Land Rover", "Defender 110", "trucks_offroad"],
    ["Yamaha", "YZF-R6", "street_bikes"],
    ["Kawasaki", "Ninja 400", "street_bikes"],
  ] as const)("guesses %s %s as %s", (make, model, expected) => {
    expect(guessVehicleCategory(make, model)).toBe(expected);
  });

  it("returns null for ordinary cars with no enthusiast signal", () => {
    expect(guessVehicleCategory("Cadillac", "ATS")).toBeNull();
    expect(guessVehicleCategory("Toyota", "Camry")).toBeNull();
    expect(guessVehicleCategory("Honda", "Civic")).toBeNull();
    // A Jeep that isn't built for the trail stays a car.
    expect(guessVehicleCategory("Jeep", "Compass")).toBeNull();
  });

  it("doesn't false-positive on short substrings inside unrelated model names", () => {
    // "rs" is a real trim keyword, but must not match as a bare substring
    // of an unrelated model name like "Versa".
    expect(guessVehicleCategory("Nissan", "Versa")).toBeNull();
    // "z" alone isn't a keyword — only specific Z-car nameplates are —
    // so a model that merely contains the letter z shouldn't match.
    expect(guessVehicleCategory("Mazda", "Mazda3")).toBeNull();
  });

  it("doesn't guess a car category for an ambiguous make's non-bike model", () => {
    // Honda and BMW sell both cars and motorcycles — only specific
    // model keywords should match, never the make alone.
    expect(guessVehicleCategory("Honda", "Accord")).toBeNull();
    expect(guessVehicleCategory("BMW", "X5")).toBeNull();
  });
});
