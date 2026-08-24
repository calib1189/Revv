export const GARAGE_TEMPLATES = {
  single: 1,
  "two-bay": 2,
  "three-bay": 3,
} as const;

export type GarageTemplate = keyof typeof GARAGE_TEMPLATES;
export type WallArt = "none" | "neon" | "pegboard" | "poster";
export type Plant = "none" | "fern" | "palm";
export type Rug = "none" | "checker" | "plain";
export type Lighting = "none" | "warm" | "cool";

export interface GarageLayout {
  template: GarageTemplate;
  bays: (string | null)[];
  wallArt: WallArt;
  plant: Plant;
  rug: Rug;
  lighting: Lighting;
}

export const DEFAULT_GARAGE_LAYOUT: GarageLayout = {
  template: "two-bay",
  bays: [null, null],
  wallArt: "none",
  plant: "none",
  rug: "none",
  lighting: "warm",
};

const TEMPLATES = Object.keys(GARAGE_TEMPLATES) as GarageTemplate[];
const WALL_ART: WallArt[] = ["none", "neon", "pegboard", "poster"];
const PLANTS: Plant[] = ["none", "fern", "palm"];
const RUGS: Rug[] = ["none", "checker", "plain"];
const LIGHTING: Lighting[] = ["none", "warm", "cool"];

function isTemplate(v: unknown): v is GarageTemplate {
  return typeof v === "string" && TEMPLATES.includes(v as GarageTemplate);
}

function isBays(v: unknown, count: number): v is (string | null)[] {
  return (
    Array.isArray(v) &&
    v.length === count &&
    v.every((id) => id === null || typeof id === "string")
  );
}

/** Lenient reader: coerces whatever is in the `garage_layout` jsonb column
 * (including the `{}` every profile starts with) into a fully-formed
 * layout, defaulting field-by-field rather than all-or-nothing. Never
 * fails — a stray or stale field just falls back silently. */
export function parseGarageLayout(raw: unknown): GarageLayout {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const template = isTemplate(r.template) ? r.template : DEFAULT_GARAGE_LAYOUT.template;
  const bayCount = GARAGE_TEMPLATES[template];
  const rawBays = Array.isArray(r.bays) ? r.bays : [];
  const bays = Array.from({ length: bayCount }, (_, i) =>
    typeof rawBays[i] === "string" ? (rawBays[i] as string) : null,
  );

  return {
    template,
    bays,
    wallArt: WALL_ART.includes(r.wallArt as WallArt) ? (r.wallArt as WallArt) : "none",
    plant: PLANTS.includes(r.plant as Plant) ? (r.plant as Plant) : "none",
    rug: RUGS.includes(r.rug as Rug) ? (r.rug as Rug) : "none",
    lighting: LIGHTING.includes(r.lighting as Lighting)
      ? (r.lighting as Lighting)
      : DEFAULT_GARAGE_LAYOUT.lighting,
  };
}

/** Strict validator for a layout submitted from the editor. Unlike
 * parseGarageLayout, an invalid shape returns null instead of silently
 * defaulting — the save action should reject a bad payload, not quietly
 * store something the client never actually asked for. */
export function validateGarageLayout(raw: unknown): GarageLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (!isTemplate(r.template)) return null;
  const bayCount = GARAGE_TEMPLATES[r.template];
  if (!isBays(r.bays, bayCount)) return null;
  if (!WALL_ART.includes(r.wallArt as WallArt)) return null;
  if (!PLANTS.includes(r.plant as Plant)) return null;
  if (!RUGS.includes(r.rug as Rug)) return null;
  if (!LIGHTING.includes(r.lighting as Lighting)) return null;

  return {
    template: r.template,
    bays: r.bays as (string | null)[],
    wallArt: r.wallArt as WallArt,
    plant: r.plant as Plant,
    rug: r.rug as Rug,
    lighting: r.lighting as Lighting,
  };
}
