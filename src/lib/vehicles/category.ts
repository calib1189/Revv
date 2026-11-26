export type VehicleCategory =
  | "street_bikes"
  | "cruisers_choppers"
  | "classics"
  | "supercars"
  | "jdm"
  | "muscle_pony"
  | "euro_performance"
  | "track_race"
  | "trucks_offroad"
  | "atv_utv"
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
  "trucks_offroad",
  "atv_utv",
  "street_bikes",
  "cruisers_choppers",
];

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  cars: "Regular Traffic",
  jdm: "JDM",
  muscle_pony: "Muscle & Pony",
  euro_performance: "Euro Performance / German",
  supercars: "Supercars",
  track_race: "Track & Race",
  classics: "Classics",
  trucks_offroad: "Trucks & Off-road",
  atv_utv: "ATVs & UTVs",
  street_bikes: "Street Bikes",
  cruisers_choppers: "Cruisers & Choppers",
};

/** Categories ranked only on their own board, never on the main one (or
 * anywhere that reads like it: your overall rank, the Build Battle, the
 * top builds in the feed). A quad isn't competing with a Mustang. */
export const SEPARATE_BOARD_CATEGORIES: readonly VehicleCategory[] = ["atv_utv"];

export function isOnMainBoard(category: string | null | undefined): boolean {
  return !(SEPARATE_BOARD_CATEGORIES as readonly string[]).includes(category ?? "cars");
}

export function isVehicleCategory(value: string): value is VehicleCategory {
  return (VEHICLE_CATEGORIES as string[]).includes(value);
}

/** What kind of machine a category is, for the few places that judge or
 * describe one differently: the AI rating (a bike has no cabin to score,
 * a quad has no truck bodywork) and the labels on its subscores. */
export type VehicleKind = "car" | "bike" | "truck" | "atv";

export function vehicleKind(category: string | null | undefined): VehicleKind {
  if (category === "street_bikes" || category === "cruisers_choppers") return "bike";
  if (category === "trucks_offroad") return "truck";
  if (category === "atv_utv") return "atv";
  return "car";
}
