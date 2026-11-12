/** How rare a store item reads, from its price. Purely a label: what an
 * item does is the same whatever it costs. */
export type Rarity = "founder" | "common" | "rare" | "epic" | "legendary";

export const RARITY_LABEL: Record<Rarity, string> = {
  founder: "Founder",
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

/** Text color for the rarity tag, readable on the app's dark and light
 * surfaces alike. */
export const RARITY_COLOR: Record<Rarity, string> = {
  founder: "#f0cd6e",
  common: "#9ca3af",
  rare: "#4ea8ff",
  epic: "#a78bfa",
  legendary: "#f5b93c",
};

/** Where each band starts. Moved with the 4x repricing of Nov 2026 so
 * every item kept the rarity it had. */
export const RARITY_MIN_PRICE = { rare: 400, epic: 800, legendary: 1400 } as const;

export function rarityFor(price: number, founderOnly = false): Rarity {
  if (founderOnly) return "founder";
  if (price >= RARITY_MIN_PRICE.legendary) return "legendary";
  if (price >= RARITY_MIN_PRICE.epic) return "epic";
  if (price >= RARITY_MIN_PRICE.rare) return "rare";
  return "common";
}
