import { describe, expect, it } from "vitest";
import { decideOnboardingNudge, onboardingNudgePayload, type NudgeCar } from "./nudges";

const DAY = 24;
function car(overrides: Partial<NudgeCar> = {}): NudgeCar {
  return { id: "c1", name: "2017 BMW 540i", hasPhoto: true, rated: false, approved: true, ageHours: 48, ...overrides };
}

describe("decideOnboardingNudge", () => {
  it("asks someone with no car to add one, a day after they joined", () => {
    expect(decideOnboardingNudge({ accountAgeHours: DAY + 1, cars: [], sent: new Set() })).toEqual({ kind: "add_car" });
    expect(decideOnboardingNudge({ accountAgeHours: DAY - 1, cars: [], sent: new Set() })).toBeNull();
  });

  it("asks to rate a car that has a photo and no score", () => {
    expect(decideOnboardingNudge({ accountAgeHours: 100, cars: [car()], sent: new Set() })).toEqual({
      kind: "rate_car",
      car: car(),
    });
  });

  it("waits a day after the car was added", () => {
    expect(decideOnboardingNudge({ accountAgeHours: 100, cars: [car({ ageHours: 5 })], sent: new Set() })).toBeNull();
  });

  it("asks for a photo when no car has one yet", () => {
    const photoless = car({ hasPhoto: false });
    expect(decideOnboardingNudge({ accountAgeHours: 100, cars: [photoless], sent: new Set() })).toEqual({
      kind: "rate_car",
      car: photoless,
    });
  });

  it("prefers a car that can be rated right now over one that needs a photo", () => {
    const a = car({ id: "a", hasPhoto: false, ageHours: 200 });
    const b = car({ id: "b", hasPhoto: true, ageHours: 30 });
    expect(decideOnboardingNudge({ accountAgeHours: 300, cars: [a, b], sent: new Set() })).toEqual({ kind: "rate_car", car: b });
  });

  it("stays quiet once any car is rated", () => {
    expect(
      decideOnboardingNudge({ accountAgeHours: 100, cars: [car({ rated: true }), car({ id: "c2" })], sent: new Set() }),
    ).toBeNull();
  });

  it("sends each nudge once, ever", () => {
    expect(decideOnboardingNudge({ accountAgeHours: 100, cars: [], sent: new Set(["add_car"]) })).toBeNull();
    expect(decideOnboardingNudge({ accountAgeHours: 100, cars: [car()], sent: new Set(["rate_car"]) })).toBeNull();
  });

  it("still asks to rate after the add-a-car nudge worked", () => {
    expect(decideOnboardingNudge({ accountAgeHours: 100, cars: [car()], sent: new Set(["add_car"]) })?.kind).toBe("rate_car");
  });
});

describe("onboardingNudgePayload", () => {
  it("reads right for each case", () => {
    expect(onboardingNudgePayload({ kind: "add_car" })).toEqual({
      title: "SORZA",
      body: "Add your car. SORZA scores it free and shows you where it ranks.",
      url: "/garage/new",
    });
    expect(onboardingNudgePayload({ kind: "rate_car", car: car() }).body).toBe(
      "Your 2017 BMW 540i is approved but has no score yet. Your first rating is free. See where it ranks.",
    );
    expect(onboardingNudgePayload({ kind: "rate_car", car: car() }).url).toBe("/garage/c1#rate");
    expect(onboardingNudgePayload({ kind: "rate_car", car: car({ approved: false }) }).body).toBe(
      "Your 2017 BMW 540i has no score yet. Your first rating is free. See where it ranks.",
    );
    expect(onboardingNudgePayload({ kind: "rate_car", car: car({ hasPhoto: false }) }).body).toBe(
      "Add a photo of your 2017 BMW 540i and SORZA will score it free.",
    );
  });
});
