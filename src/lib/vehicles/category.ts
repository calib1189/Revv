export type VehicleCategory =
  | "street_bikes"
  | "cruisers_choppers"
  | "classics"
  | "supercars"
  | "jdm"
  | "muscle_pony"
  | "euro_performance"
  | "track_race"
  | "cars";

/** Single source of truth for the vehicle category allowlist — mirrored
 * by a check constraint in the vehicles table migration, and used by
 * both the vehicle form (to choose one) and the leaderboard (to split
 * by one). "cars" is the default/general bucket for anything that isn't
 * a more specific enthusiast category — a daily-driven sedan, not a
 * dedicated track car or a period-correct classic. */
export const VEHICLE_CATEGORIES: VehicleCategory[] = [
  "cars",
  "jdm",
  "muscle_pony",
  "euro_performance",
  "supercars",
  "track_race",
  "classics",
  "street_bikes",
  "cruisers_choppers",
];

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  cars: "Cars",
  jdm: "JDM",
  muscle_pony: "Muscle & Pony",
  euro_performance: "Euro Performance / German",
  supercars: "Supercars",
  track_race: "Track & Race",
  classics: "Classics",
  street_bikes: "Street Bikes",
  cruisers_choppers: "Cruisers & Choppers",
};

export function isVehicleCategory(value: string): value is VehicleCategory {
  return (VEHICLE_CATEGORIES as string[]).includes(value);
}
