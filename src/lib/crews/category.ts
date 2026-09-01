export type CrewCategory =
  | "make_model"
  | "local_area"
  | "scene"
  | "club"
  | "private_group"
  | "other";

/** Single source of truth for the crew category allowlist — mirrored by a
 * check constraint in 0064_crews.sql, and used by the crew form and the
 * discover page. Same "app-level allowlist + matching DB constraint"
 * pattern as vehicles/category.ts. */
export const CREW_CATEGORIES: CrewCategory[] = [
  "make_model",
  "local_area",
  "scene",
  "club",
  "private_group",
  "other",
];

export const CREW_CATEGORY_LABELS: Record<CrewCategory, string> = {
  make_model: "Make / Model",
  local_area: "Local Area",
  scene: "Scene",
  club: "Car Club",
  private_group: "Private Group",
  other: "Other",
};

export function isCrewCategory(value: string): value is CrewCategory {
  return (CREW_CATEGORIES as string[]).includes(value);
}
