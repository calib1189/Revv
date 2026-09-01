import { describe, expect, it } from "vitest";
import { validateCrewForm } from "./crew";

const valid = { name: "Louisiana Mustang Crew", description: "", category: "make_model", locationText: "" };

describe("validateCrewForm", () => {
  it("passes for a fully valid entry", () => {
    expect(validateCrewForm(valid)).toEqual({});
  });

  it("passes with optional fields filled in too", () => {
    expect(
      validateCrewForm({
        ...valid,
        description: "For Mustang owners across Louisiana.",
        locationText: "Hammond, LA",
      }),
    ).toEqual({});
  });

  it("rejects a name that's too short", () => {
    expect(validateCrewForm({ ...valid, name: "A" }).name).toMatch(/at least/i);
  });

  it("rejects a name that's too long", () => {
    expect(validateCrewForm({ ...valid, name: "A".repeat(61) }).name).toMatch(/60 characters/i);
  });

  it("rejects a description over 1000 characters", () => {
    expect(validateCrewForm({ ...valid, description: "A".repeat(1001) }).description).toMatch(
      /1000 characters/i,
    );
  });

  it("rejects an invalid category", () => {
    expect(validateCrewForm({ ...valid, category: "spaceship" }).category).toMatch(/category/i);
  });

  it("accepts every real category", () => {
    for (const category of ["make_model", "local_area", "scene", "club", "private_group", "other"]) {
      expect(validateCrewForm({ ...valid, category }).category).toBeUndefined();
    }
  });

  it("rejects a location over 200 characters", () => {
    expect(validateCrewForm({ ...valid, locationText: "A".repeat(201) }).locationText).toMatch(
      /200 characters/i,
    );
  });
});
