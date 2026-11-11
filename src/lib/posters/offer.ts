import { earnedDecalTier } from "@/lib/decals/eligibility";
import { POSTER_PRODUCTS, photoPrintsSharp, type PosterProductId } from "@/lib/posters/products";
import type { RankTier } from "@/lib/rating/rank";
import { posterSubscores } from "@/lib/posters/snapshot";

/** A build poster the viewer can order for one of their cars, with each
 * size marked by whether the cover photo prints sharp at it. */
export interface PosterOffer {
  vehicleId: string;
  /** The car's display name: nickname, else make and model. */
  carName: string;
  tier: RankTier;
  score: number;
  photoUrl: string;
  /** Whether the rating has all five category scores to print. Ratings
   * from before categories existed don't; a re-rate adds them. */
  categoryScores: boolean;
  products: { id: PosterProductId; name: string; detail: string; priceCents: number; sharp: boolean }[];
}

interface OfferVehicle {
  id: string;
  owner_id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  nickname: string | null;
  ownership_verification_status: string;
}

/** The car as the poster prints it: "1966 Ford Mustang Coupe". */
export function posterCarName(v: Pick<OfferVehicle, "year" | "make" | "model" | "trim">): string {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
}

/**
 * The poster offer for a car, or null. Same rule as the rank decal (the
 * owner, an approved car, a real score), plus a cover photo to print.
 * Checked again on the server when the order is placed.
 */
export function buildPosterOffer({
  vehicle,
  build,
  hero,
  viewerId,
  photoUrl,
}: {
  vehicle: OfferVehicle;
  build: { ai_rating_score: number | null; ai_rating_subscores?: unknown } | null;
  hero: { kind: string; storage_path: string; width: number | null; height: number | null } | null;
  viewerId: string | null;
  photoUrl: string | null;
}): PosterOffer | null {
  const score = build?.ai_rating_score ?? null;
  const tier = earnedDecalTier({
    ownerId: vehicle.owner_id,
    viewerId,
    verificationStatus: vehicle.ownership_verification_status,
    score,
  });
  if (!tier || score == null || !hero || hero.kind !== "image" || !photoUrl) return null;
  return {
    vehicleId: vehicle.id,
    carName: vehicle.nickname || [vehicle.make, vehicle.model].filter(Boolean).join(" "),
    tier,
    score,
    photoUrl,
    categoryScores: posterSubscores(build?.ai_rating_subscores) !== null,
    products: POSTER_PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      detail: p.detail,
      priceCents: p.priceCents,
      sharp: photoPrintsSharp(hero, p),
    })),
  };
}
