/**
 * Points sold for real money. Points only buy cosmetics, and every
 * cosmetic can still be earned for free, so nothing in SORZA sits behind
 * a paywall: this just lets people skip the grind.
 *
 * appleProductId must match a Consumable in-app purchase created in App
 * Store Connect with the same price. Stripe charges priceCents directly,
 * so the web needs nothing set up per pack.
 */
export interface PointPack {
  id: string;
  points: number;
  priceCents: number;
  appleProductId: string;
  /** Shown on the pack, e.g. "+20% bonus". */
  bonus?: string;
}

export const POINT_PACKS: PointPack[] = [
  { id: "points_100", points: 100, priceCents: 99, appleProductId: "com.sorza.app.points.100" },
  { id: "points_550", points: 550, priceCents: 499, appleProductId: "com.sorza.app.points.550", bonus: "+10% bonus" },
  { id: "points_1200", points: 1200, priceCents: 999, appleProductId: "com.sorza.app.points.1200", bonus: "+20% bonus" },
  { id: "points_2600", points: 2600, priceCents: 1999, appleProductId: "com.sorza.app.points.2600", bonus: "+30% bonus" },
];

/** The on-switch for selling points, flipped in the environment only
 * once everything behind it is set up (migration 0110, Stripe's refund
 * webhook, the App Store products and key). Off, the store shows no packs
 * and the server refuses any purchase, except for admins, who can test
 * real purchases end to end before anyone else sees them. */
export function pointsPacksEnabled(isAdmin = false): boolean {
  return process.env.POINTS_PACKS_ENABLED === "true" || isAdmin;
}

export function packById(id: string): PointPack | null {
  return POINT_PACKS.find((p) => p.id === id) ?? null;
}

export function packByAppleProductId(productId: string): PointPack | null {
  return POINT_PACKS.find((p) => p.appleProductId === productId) ?? null;
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
