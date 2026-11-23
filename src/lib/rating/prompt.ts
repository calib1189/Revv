import type { VehicleKind } from "@/lib/vehicles/category";

/*
 * The AI build rating's instructions, written for the kind of vehicle
 * being rated. Cars read exactly as they always have; a bike or a truck
 * gets the same scale and the same five categories, with the places a
 * car-only reading would be unfair spelled out: a bike has no cabin (its
 * `interior` is the cockpit), and a truck's lift, tires and armor are
 * real modifications rather than odd fitment.
 */

interface KindWords {
  /** "car build", "motorcycle build", "truck build" */
  noun: string;
  lookAt: string;
  majorMods: string;
  performance: string;
  wheelsFitment: string;
  interior: string;
  noInteriorPhotos: string;
}

const WORDS: Record<VehicleKind, KindWords> = {
  car: {
    noun: "car",
    lookAt: "paint, body panels, bumpers, lights, wheels, stance, and interior",
    majorMods:
      "Custom paint, custom-fabricated panels, widebody kits, and other bodywork are major modifications",
    performance: "engine/drivetrain mods, exhaust, intake, tuning — actual go-fast work, not looks",
    wheelsFitment: "wheel choice, wheel/tire fitment, stance, ride height",
    interior: "condition and any interior modifications — seats, gauges, audio, trim",
    noInteriorPhotos: "a car with no interior photos",
  },
  bike: {
    noun: "motorcycle",
    lookAt:
      "paint, tank, fairings and bodywork, lights, exhaust, wheels, suspension, stance, and the cockpit (seat, bars, controls, gauges)",
    majorMods:
      "Custom paint, custom or swapped fairings and bodywork, fabricated subframes and tails, and full exhaust systems are major modifications",
    performance: "engine mods, exhaust, intake, tuning, gearing — actual go-fast work, not looks",
    wheelsFitment: "wheel choice, tires, suspension setup and quality, stance, ride height",
    interior:
      "the cockpit, since a motorcycle has no cabin — seat, bars, grips, levers, controls, mirrors, gauges: their condition and any modifications",
    noInteriorPhotos: "a bike with no close-up of its cockpit",
  },
  truck: {
    noun: "truck",
    lookAt:
      "paint, body panels, bumpers, lights, wheels and tires, lift or level, stance, armor and off-road gear, the bed, and interior",
    majorMods:
      "Custom paint, fabricated bumpers and armor, long-travel or lift suspension work, and bed builds are major modifications — a lift, bigger tires and off-road gear are real modifications, not odd fitment",
    performance:
      "engine/drivetrain mods, exhaust, intake, tuning, gearing, lockers — actual go-fast or go-anywhere work, not looks",
    wheelsFitment: "wheel and tire choice and size, fitment, lift or level, stance, ride height",
    interior: "condition and any interior modifications — seats, gauges, audio, trim",
    noInteriorPhotos: "a truck with no interior photos",
  },
};

export function ratingPrompt(kind: VehicleKind = "car"): string {
  const w = WORDS[kind];
  return (
    `You are rating a ${w.noun} build for a fun, gamified ranking feature on an ` +
    "automotive social app — think of it like a video game rank, not a " +
    "professional appraisal. The photos are the primary evidence — look " +
    `closely at ${w.lookAt} for anything custom or modified, even if it isn't itemized in ` +
    `the build details below. ${w.majorMods} — weigh them ` +
    "at least as heavily as bolt-on parts. Give an honest but encouraging " +
    "precise score from 0 to 100 with two decimal places (e.g. 83.47, " +
    "71.82, 94.16). Every hundredth is available: don't round to whole, " +
    "half or quarter points (.00, .25, .50, .75) — use the decimals for " +
    "real differentiation between similar builds, considering " +
    `how coherent and well-executed the build looks and how clean the ${w.noun} ` +
    `presents in the photos. A bone-stock ${w.noun} isn't bad, it just scores ` +
    `lower than a thoughtfully built one — but only call a ${w.noun} stock if ` +
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
    `presentation), \`performance\` (${w.performance}), \`wheelsFitment\` ` +
    `(${w.wheelsFitment}), \`interior\` ` +
    `(${w.interior}), and \`modifications\` (the overall scope and ambition of the ` +
    "build's mods as a whole, stock being low here). Score each facet on " +
    `what's actually visible — ${w.noInteriorPhotos} still gets ` +
    "an honest `interior` score based on what little is visible or, if " +
    "truly nothing is visible, a neutral middle-of-the-road score rather " +
    "than guessing high or low."
  );
}
