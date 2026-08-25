/** The parts catalog's browsable category taxonomy — fixed, not derived
 * from whatever rows happen to already be in the (admin/matching-job-
 * curated, still mostly empty) `parts` table. Same reasoning as
 * VehicleCategory: a `text` column with no DB-level enum, but a stable
 * set the app treats as the real categories so browsing works today,
 * before the catalog has real coverage, instead of the page's category
 * list literally being empty until someone else populates the table.
 *
 * `searchKeyword` powers the "shop this category" affiliate link shown
 * when a category has no verified catalog rows yet (see PartsBrowser) —
 * null for "merch" on purpose: there's no honest generic search for a
 * REVV-branded product that doesn't exist yet, unlike a real named part
 * category, which genuinely can be searched for on a real retailer. */
export interface PartCategory {
  id: string;
  label: string;
  searchKeyword: string | null;
}

export const PART_CATEGORIES: PartCategory[] = [
  { id: "exterior", label: "Exterior Body", searchKeyword: "car exterior body kit parts" },
  { id: "lighting", label: "Lighting", searchKeyword: "car headlights taillights" },
  { id: "wheels-tires", label: "Wheels & Tires", searchKeyword: "car wheels tires" },
  { id: "brakes", label: "Brakes", searchKeyword: "car brake kit" },
  { id: "suspension", label: "Suspension & Chassis", searchKeyword: "car suspension coilovers" },
  { id: "exhaust-intake", label: "Exhaust & Intake", searchKeyword: "car exhaust cold air intake" },
  { id: "engine-drivetrain", label: "Engine & Drivetrain", searchKeyword: "car engine performance parts" },
  { id: "cooling", label: "Cooling", searchKeyword: "car radiator cooling parts" },
  { id: "electrical-tech", label: "Electrical & Tech", searchKeyword: "car electronics gauges" },
  { id: "audio", label: "Audio", searchKeyword: "car audio speakers" },
  { id: "interior", label: "Interior", searchKeyword: "car interior accessories" },
  { id: "safety-racing", label: "Safety & Racing", searchKeyword: "racing roll cage harness" },
  { id: "off-road-utility", label: "Off-Road & Utility", searchKeyword: "off road truck accessories" },
  { id: "merch", label: "Merch", searchKeyword: null },
];

export function getPartCategoryLabel(id: string): string {
  return PART_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
