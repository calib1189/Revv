export type StoreCategory =
  | "name_color"
  | "profile_background"
  | "showcase_frame"
  | "vehicle_name_color"
  | "garage_backdrop"
  | "crew_name_color"
  | "crew_banner"
  | "crew_frame";

export const STORE_CATEGORY_LABELS: Record<StoreCategory, string> = {
  name_color: "Name Color",
  profile_background: "Profile Background",
  showcase_frame: "Showcase Frame",
  vehicle_name_color: "Nameplate Color",
  garage_backdrop: "Garage Backdrop",
  crew_name_color: "Crew Name Color",
  crew_banner: "Crew Banner",
  crew_frame: "Crew Badge Frame",
};

export interface StoreItem {
  id: string;
  category: StoreCategory;
  name: string;
  price: number;
  /** *_name_color categories: a CSS color or gradient applied to text.
   *  *_background/*_banner categories: a CSS `background` value for a
   *  panel. *_frame categories: a className (defined in globals.css)
   *  applied as a ring — the whole effect, animation included, lives in
   *  the class for this category. */
  value: string;
  /** Epic-tier *_name_color / *_background / *_banner items only: an
   *  additional className (defined in globals.css) that layers a moving
   *  background-position animation (or, for Neon, a glow-pulse) on top
   *  of `value`. Kept separate from `value` because `value` alone still
   *  has to work as a plain static color/gradient — this field is the
   *  opt-in for the shimmer. */
  effectClassName?: string;
  /** Reserved for profiles.is_founder — never sold, never shown, never
   *  equippable by anyone else. Checked server-side in
   *  purchaseItemAction and every equip action, not just hidden from
   *  the UI: listStoreItemsByCategory's own filtering is the normal
   *  path, but a request naming the id directly still has to be
   *  rejected the same way an under-priced purchase would be. */
  founderOnly?: boolean;
}

/** A fixed, code-defined catalog — same relationship to
 * store_items_owned that the achievement catalog has to
 * user_achievements: a real, permanent list, not a database table.
 * Prices are looked up from here server-side (features/store/actions.ts),
 * never trusted from the client, so there's no way to buy an item for
 * less than its real price no matter what a request claims. */
const PROFILE_ITEMS: StoreItem[] = [
  // ---- Name colors ----
  { id: "name_ice", category: "name_color", name: "Ice Blue", price: 50, value: "#38bdf8" },
  { id: "name_emerald", category: "name_color", name: "Emerald", price: 50, value: "#22c55e" },
  { id: "name_violet", category: "name_color", name: "Violet", price: 75, value: "#a78bfa" },
  { id: "name_gold", category: "name_color", name: "Gold", price: 100, value: "#fbbf24" },
  { id: "name_pink", category: "name_color", name: "Hot Pink", price: 100, value: "#f472b6" },
  {
    id: "name_chrome",
    category: "name_color",
    name: "Chrome",
    price: 150,
    value: "linear-gradient(120deg, #e4e4e7, #fafafa, #a1a1aa, #f4f4f5)",
  },
  {
    id: "name_royal",
    category: "name_color",
    name: "Royal",
    price: 160,
    value: "linear-gradient(120deg, #1e3a8a, #fbbf24, #1e3a8a)",
  },
  {
    id: "name_titanium",
    category: "name_color",
    name: "Titanium",
    price: 220,
    value:
      "linear-gradient(90deg, #3f3f46, #a1a1aa, #e4e4e7, #71717a, #3f3f46, #a1a1aa, #3f3f46)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_toxic",
    category: "name_color",
    name: "Toxic",
    price: 200,
    value: "linear-gradient(90deg, #14532d, #a3e635, #4ade80, #a3e635, #14532d)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_inferno",
    category: "name_color",
    name: "Inferno",
    price: 240,
    value: "linear-gradient(90deg, #7f1d1d, #f97316, #fbbf24, #f97316, #7f1d1d)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_holographic",
    category: "name_color",
    name: "Holographic",
    price: 380,
    value:
      "linear-gradient(90deg, #f472b6, #a78bfa, #38bdf8, #4ade80, #fbbf24, #f472b6, #a78bfa)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_carbon",
    category: "name_color",
    name: "Carbon Fiber",
    price: 140,
    // Same layered-weave technique as bg_carbon and frame_carbon, just a
    // tighter period so the weave still reads at text size.
    value:
      "repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 1px, transparent 1px, transparent 6px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.45) 0px, rgba(0,0,0,0.45) 2px, transparent 2px, transparent 6px), repeating-linear-gradient(45deg, #4b4b52 0px, #4b4b52 3px, #1c1c1f 3px, #1c1c1f 6px)",
  },
  {
    id: "name_bronze",
    category: "name_color",
    name: "Bronze",
    price: 70,
    value: "linear-gradient(120deg, #7c4a1e, #c98a52, #e8b989, #c98a52, #7c4a1e)",
  },
  {
    id: "name_neon",
    category: "name_color",
    name: "Neon",
    price: 90,
    value: "#22d3ee",
    effectClassName: "text-neon-pulse",
  },
  {
    id: "name_cosmic",
    category: "name_color",
    name: "Cosmic",
    price: 200,
    value: "linear-gradient(120deg, #2e1065, #7c3aed, #a78bfa, #7c3aed, #2e1065)",
  },
  {
    id: "name_aurora",
    category: "name_color",
    name: "Aurora",
    price: 280,
    value: "linear-gradient(90deg, #0f766e, #22d3ee, #4ade80, #22d3ee, #0f766e)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_diamond",
    category: "name_color",
    name: "Diamond",
    price: 420,
    value:
      "linear-gradient(90deg, #6bc4ea, #ffffff, #bff4ff, #7dd3fc, #ffffff, #a5f3fc, #ffffff, #6bc4ea)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_legendary",
    category: "name_color",
    name: "Legendary",
    price: 550,
    value: "linear-gradient(90deg, #451a03, #fbbf24, #ef4444, #a21caf, #451a03, #fbbf24)",
    effectClassName: "text-shimmer-anim",
  },
  { id: "name_ruby", category: "name_color", name: "Ruby", price: 110, value: "#e0115f" },
  {
    id: "name_founder",
    category: "name_color",
    name: "Founder",
    price: 0,
    value: "linear-gradient(90deg, #000000, #ff4433, #fbbf24, #ff4433, #000000)",
    effectClassName: "text-shimmer-anim",
    founderOnly: true,
  },

  // ---- Profile backgrounds ----
  {
    id: "bg_midnight",
    category: "profile_background",
    name: "Midnight",
    price: 60,
    value: "linear-gradient(160deg, #0f172a, #1e1b4b)",
  },
  {
    id: "bg_sunset",
    category: "profile_background",
    name: "Sunset",
    price: 90,
    value: "linear-gradient(160deg, #451a03, #7c2d12, #9a3412)",
  },
  {
    id: "bg_racing",
    category: "profile_background",
    name: "Racing Stripes",
    price: 120,
    // Two thick vertical stripes down the middle — classic Shelby/GT
    // livery — rather than the old thin repeating diagonal pattern.
    value:
      "linear-gradient(90deg, #18181b 0%, #18181b 40%, #ff4433 40%, #ff4433 48%, #18181b 48%, #18181b 52%, #ff4433 52%, #ff4433 60%, #18181b 60%, #18181b 100%)",
  },
  {
    id: "bg_carbon",
    category: "profile_background",
    name: "Carbon Fiber",
    price: 150,
    // Three layered diagonal gradients (a light sheen, a dark cross-hatch,
    // and the base weave) rather than one flat diagonal stripe — reads as
    // an actual woven twill instead of a candy-cane pattern.
    value:
      "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 8px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.55) 0px, rgba(0,0,0,0.55) 4px, transparent 4px, transparent 8px), repeating-linear-gradient(45deg, #26262a 0px, #26262a 4px, #131315 4px, #131315 8px)",
  },
  {
    id: "bg_cosmic",
    category: "profile_background",
    name: "Cosmic",
    price: 250,
    value: "linear-gradient(160deg, #2e1065, #7c3aed, #4c1d95, #0a0a0b)",
  },
  {
    id: "bg_velocity",
    category: "profile_background",
    name: "Velocity",
    price: 220,
    value:
      "repeating-linear-gradient(115deg, #18181b 0px, #18181b 40px, #ff8800 40px, #ff8800 46px, #18181b 46px, #18181b 86px)",
    effectClassName: "bg-velocity-anim",
  },
  {
    id: "bg_chrome_flow",
    category: "profile_background",
    name: "Chrome Flow",
    price: 260,
    value: "linear-gradient(100deg, #18181b, #71717a, #f4f4f5, #71717a, #18181b, #a1a1aa, #18181b)",
    effectClassName: "bg-chrome-flow-anim",
  },
  {
    id: "bg_inferno",
    category: "profile_background",
    name: "Inferno",
    price: 280,
    value: "linear-gradient(200deg, #1c0a00, #7f1d1d, #f97316, #fbbf24, #7f1d1d, #1c0a00)",
    effectClassName: "bg-inferno-anim",
  },
  {
    id: "bg_aurora",
    category: "profile_background",
    name: "Aurora",
    price: 320,
    value:
      "linear-gradient(120deg, #041016, #0f766e, #22d3ee, #4ade80, #0f766e, #041016, #7c3aed)",
    effectClassName: "bg-aurora-anim",
  },
  {
    id: "bg_galaxy",
    category: "profile_background",
    name: "Galaxy",
    price: 380,
    value:
      "conic-gradient(from var(--rank-angle, 0deg) at 50% 50%, #0a0a1f, #2e1065, #7c3aed, #1e3a8a, #0a0a1f, #4c1d95, #0a0a1f)",
    effectClassName: "bg-galaxy-anim",
  },
  {
    id: "bg_bronze",
    category: "profile_background",
    name: "Bronze",
    price: 130,
    value: "linear-gradient(160deg, #2b1a0d, #7c4a1e, #c98a52, #3a2412)",
  },
  {
    id: "bg_gold",
    category: "profile_background",
    name: "Gold",
    price: 150,
    value: "linear-gradient(160deg, #3a2c05, #b8860b, #fbbf24, #fff4c2, #b8860b)",
  },
  {
    id: "bg_neon",
    category: "profile_background",
    name: "Neon",
    price: 190,
    value: "linear-gradient(160deg, #041016, #0e2a30, #041016)",
    effectClassName: "bg-neon-pulse",
  },
  {
    id: "bg_toxic",
    category: "profile_background",
    name: "Toxic",
    price: 230,
    value: "linear-gradient(160deg, #052e16, #14532d, #a3e635, #4ade80, #14532d, #052e16)",
    effectClassName: "bg-inferno-anim",
  },
  {
    id: "bg_titanium",
    category: "profile_background",
    name: "Titanium",
    price: 250,
    // Heat-blued titanium (the anodized tint on a titanium exhaust tip)
    // instead of plain brushed-metal grays — a lot more premium and a
    // direct, recognizable car-culture reference, not just a flat gray
    // sweep.
    value:
      "linear-gradient(100deg, #14161c, #3c4656, #6b5b95, #93a8c2, #6b5b95, #3c4656, #14161c)",
    effectClassName: "bg-chrome-flow-anim",
  },
  {
    id: "bg_diamond",
    category: "profile_background",
    name: "Diamond",
    price: 420,
    // Pure #ffffff at the peak used to sweep across as a stark white
    // flash against the dark UI — replaced with a pale ice-blue so the
    // highlight still reads as a sparkle without blowing out.
    value: "linear-gradient(120deg, #0a1520, #2a6f8f, #a8e6f5, #e4faff, #a8e6f5, #2a6f8f, #0a1520)",
    effectClassName: "bg-chrome-flow-anim",
  },
  {
    id: "bg_legendary",
    category: "profile_background",
    name: "Legendary",
    price: 550,
    value: "linear-gradient(150deg, #1c0a00, #451a03, #fbbf24, #ef4444, #a21caf, #1c0a00)",
    effectClassName: "bg-inferno-anim",
  },
  {
    id: "bg_founder",
    category: "profile_background",
    name: "Founder",
    price: 0,
    value: "linear-gradient(135deg, #050505, #1a0000, #450a0a, #1a0000, #050505)",
    effectClassName: "bg-chrome-flow-anim",
    founderOnly: true,
  },

  // ---- Showcase frames ----
  { id: "frame_bronze", category: "showcase_frame", name: "Bronze Ring", price: 40, value: "frame-bronze-ring" },
  { id: "frame_neon", category: "showcase_frame", name: "Neon Ring", price: 100, value: "frame-neon-ring" },
  { id: "frame_gold", category: "showcase_frame", name: "Gold Ring", price: 140, value: "frame-gold-ring" },
  { id: "frame_inferno", category: "showcase_frame", name: "Inferno Ring", price: 220, value: "frame-inferno-ring" },
  { id: "frame_prism", category: "showcase_frame", name: "Prism Ring", price: 300, value: "frame-prism-ring" },
  { id: "frame_aurora", category: "showcase_frame", name: "Aurora Ring", price: 340, value: "frame-aurora-ring" },
  { id: "frame_diamond", category: "showcase_frame", name: "Diamond Ring", price: 420, value: "frame-diamond-ring" },
  {
    id: "frame_legendary",
    category: "showcase_frame",
    name: "Legendary Ring",
    price: 550,
    value: "frame-legendary-ring",
  },
  { id: "frame_carbon", category: "showcase_frame", name: "Carbon Ring", price: 90, value: "frame-carbon-ring" },
  { id: "frame_toxic", category: "showcase_frame", name: "Toxic Ring", price: 230, value: "frame-toxic-ring" },
  {
    id: "frame_titanium",
    category: "showcase_frame",
    name: "Titanium Ring",
    price: 180,
    value: "frame-titanium-ring",
  },
  { id: "frame_cosmic", category: "showcase_frame", name: "Cosmic Ring", price: 180, value: "frame-cosmic-ring" },
  {
    id: "frame_founder",
    category: "showcase_frame",
    name: "Founder Ring",
    price: 0,
    value: "frame-founder-ring",
    founderOnly: true,
  },
];

const PROFILE_ITEM_BY_ID = new Map(PROFILE_ITEMS.map((item) => [item.id, item]));

/** Re-packages an existing profile-scope item's visual (value +
 * effectClassName + founderOnly) under a new id/category for the
 * garage and crew shops — same look, same exclusivity, different slot.
 * Keeps the CSS/gradients defined exactly once above instead of
 * re-typing every color string per shop; throws at module load (not
 * silently) if a theme id is ever wrong, since that's a real bug in
 * this file, not user input. */
function deriveItem(sourceId: string, newId: string, category: StoreCategory): StoreItem {
  const source = PROFILE_ITEM_BY_ID.get(sourceId);
  if (!source) throw new Error(`lib/store/catalog: unknown source item "${sourceId}"`);
  return {
    id: newId,
    category,
    name: source.name,
    price: source.price,
    value: source.value,
    effectClassName: source.effectClassName,
    founderOnly: source.founderOnly,
  };
}

/** Every theme below has a complete name/background/frame trio already
 * built for the profile shop — reused as-is (same colors, same
 * animations) for the garage and crew shops rather than inventing a
 * second wardrobe of colors. Pattern-only profile items (Midnight,
 * Sunset, Racing Stripes, Velocity, Chrome, Royal, Ice/Emerald/Violet/
 * Pink solids, Holographic, Prism) don't have a full trio and are
 * deliberately left as profile-only. */
const MATERIAL_THEMES = [
  "carbon",
  "bronze",
  "gold",
  "neon",
  "toxic",
  "titanium",
  "cosmic",
  "aurora",
  "diamond",
  "legendary",
  "inferno",
  "founder",
] as const;

const GARAGE_ITEMS: StoreItem[] = MATERIAL_THEMES.flatMap((theme) => [
  deriveItem(`name_${theme}`, `vname_${theme}`, "vehicle_name_color"),
  deriveItem(`bg_${theme}`, `gbackdrop_${theme}`, "garage_backdrop"),
]);

const CREW_ITEMS: StoreItem[] = MATERIAL_THEMES.flatMap((theme) => [
  deriveItem(`name_${theme}`, `cname_${theme}`, "crew_name_color"),
  deriveItem(`bg_${theme}`, `cbanner_${theme}`, "crew_banner"),
  deriveItem(`frame_${theme}`, `cframe_${theme}`, "crew_frame"),
]);

/** Themes that only need the name-color slot everywhere (no matching
 * background/frame requested) — same deriveItem reuse as
 * MATERIAL_THEMES, just for the one category instead of a full trio. */
const NAME_COLOR_ONLY_THEMES = ["ruby"] as const;

const NAME_COLOR_ONLY_ITEMS: StoreItem[] = NAME_COLOR_ONLY_THEMES.flatMap((theme) => [
  deriveItem(`name_${theme}`, `vname_${theme}`, "vehicle_name_color"),
  deriveItem(`name_${theme}`, `cname_${theme}`, "crew_name_color"),
]);

export const STORE_ITEMS: StoreItem[] = [
  ...PROFILE_ITEMS,
  ...GARAGE_ITEMS,
  ...CREW_ITEMS,
  ...NAME_COLOR_ONLY_ITEMS,
];

const STORE_ITEM_BY_ID = new Map(STORE_ITEMS.map((item) => [item.id, item]));

export function getStoreItem(id: string): StoreItem | undefined {
  return STORE_ITEM_BY_ID.get(id);
}

/** `includeFounderOnly` defaults to false so every existing call site
 * (the vast majority of them) automatically excludes founder-exclusive
 * items without having to know that concept exists — a caller has to
 * deliberately opt in (after checking the viewer's own
 * profiles.is_founder) to ever see one listed. This is the display
 * side of the exclusivity; purchaseItemAction and the equip actions
 * separately enforce it server-side regardless of what the UI shows. */
export function listStoreItemsByCategory(
  category: StoreCategory,
  { includeFounderOnly = false }: { includeFounderOnly?: boolean } = {},
): StoreItem[] {
  return STORE_ITEMS.filter(
    (item) => item.category === category && (includeFounderOnly || !item.founderOnly),
  );
}
