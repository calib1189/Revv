import { describe, expect, it } from "vitest";
import { describeMissingShots, missingShots } from "./missing-shots";

// Real "what's holding it back" text from live ratings, 2026-11-17.
const MUSTANG =
  "While the exterior presentation is stunning, the modern multi-spoke wheels clash slightly with the classic lines of a 1966 coupe compared to a traditional deep-dish or vintage-style wheel. Additionally, a lack of clear engine bay or interior shots leaves some of the heavily invested drivetrain and cabin modifications unseen.";
const MUSTANG_FIRST =
  "The modern multi-spoke wheels clash slightly with the classic muscle car proportions, and the stance could benefit from a slightly more aggressive drop. Additional engine bay detailing or interior shots would help push this build into the 90+ tier.";
const SNEK =
  "Without visible interior or engine bay shots, it is impossible to verify if the cabin and powertrain match the striking exterior presence. A bit more engine bay detailing or interior custom work would push this into the 90+ tier.";
const M235I = "The ride height leaves a slight wheel gap that could be closed up for a more aggressive stance, and interior modifications are not visible.";
// About the build itself, not about photos: no prompt.
const NOISY =
  "To push into the highest tier, the interior and engine bay could use more detailed showcase elements to match the immaculate exterior presentation. Additional aero elements or a more aggressive splitter setup would further elevate the track-inspired aesthetic.";
const ATS =
  "The wheel gap is still quite prominent, and lowering springs or coilovers would dramatically improve the overall stance. Completing the planned cold air intake and adding further engine tuning would elevate the performance aspect.";

describe("missingShots", () => {
  it("finds both when the AI says it couldn't see them", () => {
    expect(missingShots(MUSTANG)).toEqual(["engine bay", "interior"]);
    expect(missingShots(MUSTANG_FIRST)).toEqual(["engine bay", "interior"]);
    expect(missingShots(SNEK)).toEqual(["engine bay", "interior"]);
  });

  it("finds just the one it mentions", () => {
    expect(missingShots(M235I)).toEqual(["interior"]);
  });

  it("ignores advice about the build itself", () => {
    expect(missingShots(NOISY)).toEqual([]);
    expect(missingShots(ATS)).toEqual([]);
  });

  it("handles no feedback", () => {
    expect(missingShots(null)).toEqual([]);
    expect(missingShots("")).toEqual([]);
  });
});

describe("describeMissingShots", () => {
  it("reads naturally for one or two", () => {
    expect(describeMissingShots(["interior"])).toBe("interior");
    expect(describeMissingShots(["engine bay", "interior"])).toBe("engine bay or interior");
  });
});
