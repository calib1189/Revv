/**
 * SORZA tees: three designs on the Gildan 5000 heavy cotton tee, printed
 * front and back and shipped by Printful. Prices are what the buyer
 * pays, US shipping included. Printful's cost, front and back, shipped
 * to a US address (Nov 2026 quote): $20.74 for S–XL, $22.74 for 2XL,
 * $24.74 for 3XL.
 *
 * Print files: public/merch/print, made by scripts/make-tee-print-files.py.
 * Shop photos: public/merch, mockups on Printful's own blank photos.
 */
export type TeeDesignId = "big-s" | "built-rated-ranked" | "wordmark";

export const TEE_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"] as const;
export type TeeSize = (typeof TEE_SIZES)[number];

export interface TeeDesign {
  id: TeeDesignId;
  name: string;
  /** Printful's name for the shirt color. */
  color: "Black" | "White" | "Dark Heather";
  /** What's printed where, for the shop. */
  detail: string;
  /** Printful catalog variant per size. */
  variants: Record<TeeSize, number>;
}

export const TEE_DESIGNS: TeeDesign[] = [
  {
    id: "big-s",
    name: "Big S",
    color: "Black",
    detail: "SORZA wordmark on the chest, the S and “The social network for car enthusiasts” on the back",
    variants: { S: 11546, M: 11547, L: 11548, XL: 11549, "2XL": 11550, "3XL": 12644 },
  },
  {
    id: "built-rated-ranked",
    name: "Built. Rated. Ranked.",
    color: "White",
    detail: "S on the chest, the S and “Built. Rated. Ranked.” on the back",
    variants: { S: 11576, M: 11577, L: 11578, XL: 11579, "2XL": 11580, "3XL": 12650 },
  },
  {
    id: "wordmark",
    name: "Wordmark",
    color: "Dark Heather",
    detail: "S on the chest, SORZA across the back",
    variants: { S: 15843, M: 15844, L: 15845, XL: 15846, "2XL": 15847, "3XL": 15848 },
  },
];

/** Bigger sizes cost Printful more, so they cost a little more here too. */
const PRICE_CENTS: Record<TeeSize, number> = { S: 2999, M: 2999, L: 2999, XL: 2999, "2XL": 3299, "3XL": 3499 };

export function teeById(id: string): TeeDesign | undefined {
  return TEE_DESIGNS.find((d) => d.id === id);
}

export function isTeeSize(size: string): size is TeeSize {
  return (TEE_SIZES as readonly string[]).includes(size);
}

export function teePriceCents(size: TeeSize): number {
  return PRICE_CENTS[size];
}

/** The starting price, for the shelf. */
export const TEE_FROM_CENTS = Math.min(...Object.values(PRICE_CENTS));

/** A design and size as one orderable line, or null if either isn't sold. */
export function teeOrderLine(designId: string, size: string): { design: TeeDesign; size: TeeSize; variantId: number; priceCents: number } | null {
  const design = teeById(designId);
  if (!design || !isTeeSize(size)) return null;
  return { design, size, variantId: design.variants[size], priceCents: PRICE_CENTS[size] };
}

/** The print files Printful downloads: the front and back of the design. */
export function teePrintFiles(designId: TeeDesignId, siteUrl: string): { type: "front" | "back"; url: string }[] {
  return (["front", "back"] as const).map((type) => ({ type, url: `${siteUrl}/merch/print/${designId}-${type}.png` }));
}

/** Transparent cut-outs of the shirt (front and back, aligned), for the
 * shop's 3D turntable. Made from Printful's own Gildan 5000 template. */
export function teePhotos3d(designId: TeeDesignId): { front: string; back: string } {
  return { front: `/merch/3d/${designId}-front.webp`, back: `/merch/3d/${designId}-back.webp` };
}

/** The shop photos of a design. */
export function teePhotos(designId: TeeDesignId): { front: string; back: string } {
  return { front: `/merch/${designId}-front.jpg`, back: `/merch/${designId}-back.jpg` };
}

/** Whether tees can be sold right now: switched on (MERCH_ENABLED; admins
 * can test before that), with Stripe to take the money and a Printful
 * token to print. Never take a payment that can't be fulfilled. */
export function merchEnabled(isAdmin = false): boolean {
  const on = process.env.MERCH_ENABLED === "true" || isAdmin;
  return on && Boolean(process.env.STRIPE_SECRET_KEY && process.env.PRINTFUL_API_TOKEN);
}
