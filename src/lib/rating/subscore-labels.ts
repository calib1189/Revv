import type { BuildRatingSubscores } from "@/lib/providers/rating-provider";
import type { VehicleKind } from "@/lib/vehicles/category";

/** The five rating categories, in display order. */
export const SUBSCORE_ORDER: (keyof BuildRatingSubscores)[] = [
  "appearance",
  "performance",
  "wheelsFitment",
  "interior",
  "modifications",
];

/** What each category is called for this kind of vehicle. The stored keys
 * never change (old ratings, posters and the leaderboard all read them);
 * only a bike's `interior` reads as Cockpit, since a bike has no cabin and
 * the rating scores its seat, bars and controls there instead. */
export function subscoreLabels(kind: VehicleKind = "car"): Record<keyof BuildRatingSubscores, string> {
  return {
    appearance: "Appearance",
    performance: "Performance",
    wheelsFitment: "Wheels/Fitment",
    interior: kind === "bike" ? "Cockpit" : "Interior",
    modifications: "Modifications",
  };
}
