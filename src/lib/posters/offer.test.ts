import { describe, expect, it } from "vitest";
import { buildPosterOffer, posterCarName } from "@/lib/posters/offer";

const vehicle = {
  id: "v1",
  owner_id: "u1",
  year: 1966,
  make: "Ford",
  model: "Mustang",
  trim: "Coupe",
  nickname: "Ruby",
  ownership_verification_status: "approved",
};
const build = { ai_rating_score: 91.25 };
const hero = { kind: "image" as const, storage_path: "u1/photo.jpg", width: 4284, height: 5712 };

describe("buildPosterOffer", () => {
  it("offers every size for the owner's approved, rated car with a sharp photo", () => {
    const offer = buildPosterOffer({ vehicle, build, hero, viewerId: "u1", photoUrl: "https://x/photo.jpg" });
    expect(offer).toMatchObject({ vehicleId: "v1", tier: "ruby", score: 91.25, carName: "Ruby" });
    expect(offer?.products.map((p) => [p.id, p.sharp])).toEqual([
      ["poster_12x16", true],
      ["poster_18x24", true],
      ["framed_12x18", true],
    ]);
  });

  it("says whether the rating has category scores to print", () => {
    const subscores = { appearance: 94, performance: 90, wheelsFitment: 85, interior: 88, modifications: 93 };
    expect(buildPosterOffer({ vehicle, build: { ai_rating_score: 91.25, ai_rating_subscores: subscores }, hero, viewerId: "u1", photoUrl: "x" })?.categoryScores).toBe(true);
    expect(buildPosterOffer({ vehicle, build: { ai_rating_score: 68.5, ai_rating_subscores: null }, hero, viewerId: "u1", photoUrl: "x" })?.categoryScores).toBe(false);
  });

  it("marks the sizes a small photo can't print sharp", () => {
    const offer = buildPosterOffer({ vehicle, build, hero: { ...hero, width: 1290, height: 1707 }, viewerId: "u1", photoUrl: "x" });
    expect(offer?.products.map((p) => p.sharp)).toEqual([true, false, true]);
  });

  it("offers nothing to anyone but the owner, or without a rating, approval or cover photo", () => {
    expect(buildPosterOffer({ vehicle, build, hero, viewerId: "someone-else", photoUrl: "x" })).toBeNull();
    expect(buildPosterOffer({ vehicle, build, hero, viewerId: null, photoUrl: "x" })).toBeNull();
    expect(buildPosterOffer({ vehicle, build: { ai_rating_score: null }, hero, viewerId: "u1", photoUrl: "x" })).toBeNull();
    expect(buildPosterOffer({ vehicle: { ...vehicle, ownership_verification_status: "pending" }, build, hero, viewerId: "u1", photoUrl: "x" })).toBeNull();
    expect(buildPosterOffer({ vehicle, build, hero: null, viewerId: "u1", photoUrl: null })).toBeNull();
    expect(buildPosterOffer({ vehicle, build, hero: { ...hero, kind: "video" }, viewerId: "u1", photoUrl: "x" })).toBeNull();
  });
});

describe("posterCarName", () => {
  it("prints the full year, make, model and trim", () => {
    expect(posterCarName(vehicle)).toBe("1966 Ford Mustang Coupe");
    expect(posterCarName({ ...vehicle, trim: null, year: null })).toBe("Ford Mustang");
  });
});
