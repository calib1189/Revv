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
    value:
      "repeating-linear-gradient(115deg, #18181b 0px, #18181b 40px, #ff4433 40px, #ff4433 46px, #18181b 46px, #18181b 86px)",
  },
  {
    id: "bg_carbon",
    category: "profile_background",
    name: "Carbon Fiber",
    price: 150,
    value:
      "repeating-linear-gradient(45deg, #1c1c1f 0px, #1c1c1f 6px, #0a0a0b 6px, #0a0a0b 12px)",
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
];

const STORE_ITEM_BY_ID = new Map(STORE_ITEMS.map((item) => [item.id, item]));

export function getStoreItem(id: string): StoreItem | undefined {
  return STORE_ITEM_BY_ID.get(id);
}

export function listStoreItemsByCategory(category: StoreCategory): StoreItem[] {
  return STORE_ITEMS.filter((item) => item.category === category);
}
