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
  /** category="name_color": a CSS color applied to the display name.
   *  category="profile_background": a CSS `background` value for the
   *  header panel. category="showcase_frame": a className (defined in
   *  globals.css) applied as a ring around a showcase badge's icon. */
  value: string;
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

  // ---- Showcase frames ----
  { id: "frame_bronze", category: "showcase_frame", name: "Bronze Ring", price: 40, value: "frame-bronze-ring" },
  { id: "frame_neon", category: "showcase_frame", name: "Neon Ring", price: 100, value: "frame-neon-ring" },
  { id: "frame_gold", category: "showcase_frame", name: "Gold Ring", price: 140, value: "frame-gold-ring" },
  { id: "frame_prism", category: "showcase_frame", name: "Prism Ring", price: 300, value: "frame-prism-ring" },
];

const STORE_ITEM_BY_ID = new Map(STORE_ITEMS.map((item) => [item.id, item]));

export function getStoreItem(id: string): StoreItem | undefined {
  return STORE_ITEM_BY_ID.get(id);
}

export function listStoreItemsByCategory(category: StoreCategory): StoreItem[] {
  return STORE_ITEMS.filter((item) => item.category === category);
}
