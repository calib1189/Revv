import { describe, expect, it } from "vitest";
import { ratingPrompt } from "./prompt";

// The car prompt as it was before bikes and trucks got their own wording:
// cars must be rated exactly as before, so every existing score stays
// comparable with new ones.
const CAR_PROMPT_BEFORE =
  "You are rating a car build for a fun, gamified ranking feature on an " +
  "automotive social app — think of it like a video game rank, not a " +
  "professional appraisal. The photos are the primary evidence — look " +
  "closely at paint, body panels, bumpers, lights, wheels, stance, and " +
  "interior for anything custom or modified, even if it isn't itemized in " +
  "the build details below. Custom paint, custom-fabricated panels, " +
  "widebody kits, and other bodywork are major modifications — weigh them " +
  "at least as heavily as bolt-on parts. Give an honest but encouraging " +
  "precise score from 0 to 100 with two decimal places (e.g. 83.47, " +
  "71.82, 94.16). Every hundredth is available: don't round to whole, " +
  "half or quarter points (.00, .25, .50, .75) — use the decimals for " +
  "real differentiation between similar builds, considering " +
  "how coherent and well-executed the build looks and how clean the car " +
  "presents in the photos. A bone-stock car isn't bad, it just scores " +
  "lower than a thoughtfully built one — but only call a car stock if " +
  "the photos actually look stock. Reserve 90+ for genuinely " +
  "exceptional, heavily customized builds and 100 for something truly " +
  "showstopping — don't hand it out easily, but don't withhold it from " +
  "a build that clearly earns it either.\n\n" +
  "Then explain the score in two parts. `strengths`: one to two sentences " +
  "naming the specific things you actually see that earned this score — " +
  "particular mods, paint quality, how coherent the theme is. " +
  "`limitingFactors`: one to two sentences naming the SPECIFIC, ACTIONABLE " +
  "things holding the score back from being higher — what looks " +
  "unfinished, inconsistent, or missing, or if the build is already " +
  "excellent, what the very highest tier would still require. Never say " +
  "something vague like 'needs more mods' without naming what kind.\n\n" +
  "Finally, break your read of the build down into five independent " +
  "0-100 subscores, each with one or two decimals and the same care " +
  "about not rounding — each is your own honest judgment of that one facet " +
  "alone, not a component that has to add up to the headline score: " +
  "`appearance` (paint, body condition, panel gaps, overall visual " +
  "presentation), `performance` (engine/drivetrain mods, exhaust, " +
  "intake, tuning — actual go-fast work, not looks), `wheelsFitment` " +
  "(wheel choice, wheel/tire fitment, stance, ride height), `interior` " +
  "(condition and any interior modifications — seats, gauges, audio, " +
  "trim), and `modifications` (the overall scope and ambition of the " +
  "build's mods as a whole, stock being low here). Score each facet on " +
  "what's actually visible — a car with no interior photos still gets " +
  "an honest `interior` score based on what little is visible or, if " +
  "truly nothing is visible, a neutral middle-of-the-road score rather " +
  "than guessing high or low.";

describe("ratingPrompt", () => {
  it("leaves the car prompt exactly as it was", () => {
    expect(ratingPrompt("car")).toBe(CAR_PROMPT_BEFORE);
    expect(ratingPrompt()).toBe(CAR_PROMPT_BEFORE);
  });

  it("rates a bike's cockpit as its interior, and never calls it a car", () => {
    const p = ratingPrompt("bike");
    expect(p).toContain("rating a motorcycle build");
    expect(p).toContain("`interior` (the cockpit, since a motorcycle has no cabin");
    expect(p).not.toMatch(/car/);
  });

  it("counts a truck's lift, tires and armor as modifications", () => {
    const p = ratingPrompt("truck");
    expect(p).toContain("rating a truck build");
    expect(p).toContain("a lift, bigger tires and off-road gear are real modifications");
    expect(p).not.toMatch(/car/);
  });

  it("asks for the same five subscores whatever the vehicle", () => {
    for (const kind of ["car", "bike", "truck"] as const) {
      for (const key of ["appearance", "performance", "wheelsFitment", "interior", "modifications"]) {
        expect(ratingPrompt(kind)).toContain(`\`${key}\``);
      }
    }
  });
});
