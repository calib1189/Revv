import { describe, expect, it } from "vitest";
import { guessVehicleCategory } from "./guess-category";

describe("guessVehicleCategory", () => {
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
  ] as const)("guesses %s %s as %s", (make, model, expected) => {
    expect(guessVehicleCategory(make, model)).toBe(expected);
  });

  it("returns null for ordinary cars with no enthusiast signal", () => {
    expect(guessVehicleCategory("Cadillac", "ATS")).toBeNull();
    expect(guessVehicleCategory("Toyota", "Camry")).toBeNull();
    expect(guessVehicleCategory("Honda", "Civic")).toBeNull();
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
