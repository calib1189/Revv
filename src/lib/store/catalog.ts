export type StoreCategory = "name_color" | "profile_background" | "showcase_frame";

export const STORE_CATEGORY_LABELS: Record<StoreCategory, string> = {
  name_color: "Name Color",
  profile_background: "Profile Background",
  showcase_frame: "Showcase Frame",
};

export interface StoreItem {
  id: string;
  category: StoreCategory;
  name: string;
  price: number;
  /** category="name_color": a CSS color or gradient applied to the
   *  display name. category="profile_background": a CSS `background`
   *  value for the header panel. category="showcase_frame": a className
   *  (defined in globals.css) applied as a ring around a showcase
   *  badge's icon — the whole effect, animation included, lives in the
   *  class for this category. */
  value: string;
  /** Epic-tier name_color / profile_background items only: an
   *  additional className (defined in globals.css) that layers a moving
   *  background-position animation on top of `value`'s gradient. Kept
   *  separate from `value` because `value` alone still has to work as a
   *  plain static color/gradient (e.g. nowhere else needs to know an
   *  item is animated) — this field is the opt-in for the shimmer. */
  effectClassName?: string;
}

/** A fixed, code-defined catalog — same relationship to
 * store_items_owned that the achievement catalog has to
 * user_achievements: a real, permanent list, not a database table.
 * Prices are looked up from here server-side (features/store/actions.ts),
 * never trusted from the client, so there's no way to buy an item for
 * less than its real price no matter what a request claims. */
export const STORE_ITEMS: StoreItem[] = [
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
    value:
      "linear-gradient(100deg, #26262b, #71717a, #d4d4d8, #71717a, #26262b, #a1a1aa, #26262b)",
    effectClassName: "bg-chrome-flow-anim",
  },
  {
    id: "bg_diamond",
    category: "profile_background",
    name: "Diamond",
    price: 420,
    value: "linear-gradient(120deg, #0c1a24, #6bc4ea, #ffffff, #bff4ff, #6bc4ea, #0c1a24)",
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
];

const STORE_ITEM_BY_ID = new Map(STORE_ITEMS.map((item) => [item.id, item]));

export function getStoreItem(id: string): StoreItem | undefined {
  return STORE_ITEM_BY_ID.get(id);
}

export function listStoreItemsByCategory(category: StoreCategory): StoreItem[] {
  return STORE_ITEMS.filter((item) => item.category === category);
}
