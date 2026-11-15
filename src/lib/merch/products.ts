/**
 * SORZA tees: three designs on the Gildan 5000 heavy cotton tee, each in
 * black, dark heather grey or white, printed front and back and shipped
 * by Printful. Prices are what the buyer pays, US shipping included.
 * Printful's cost, front and back, shipped to a US address (Nov 2026
 * quote): $20.74 for S–XL, $22.74 for 2XL, $24.74 for 3XL. The blank
 * costs the same in all three colours (checked Nov 2026), so one price
 * per size covers them all.
 *
 * Print files: public/merch/print, made by scripts/make-tee-print-files.py,
 * in two inks: dark for the white shirt, white for black and grey.
 * Shop photos: public/merch/3d and /4k, on Printful's own blank photos.
 */
export type TeeDesignId = "big-s" | "built-rated-ranked" | "wordmark";

export const TEE_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"] as const;
export type TeeSize = (typeof TEE_SIZES)[number];

export const TEE_COLORS = ["black", "grey", "white"] as const;
export type TeeColor = (typeof TEE_COLORS)[number];

interface TeeColorInfo {
  /** What the shop calls it. */
  label: string;
  /** Printful's name for it. */
  printful: string;
  /** For the swatch. */
  swatch: string;
  /** Which print file goes on it: dark ink on white, white ink otherwise. */
  ink: "ink" | "white";
  /** Printful catalog variant per size. */
  variants: Record<TeeSize, number>;
}

export const TEE_COLOR_INFO: Record<TeeColor, TeeColorInfo> = {
  black: {
    label: "Black",
    printful: "Black",
    swatch: "#141313",
    ink: "white",
    variants: { S: 11546, M: 11547, L: 11548, XL: 11549, "2XL": 11550, "3XL": 12644 },
  },
  grey: {
    label: "Grey",
    printful: "Dark Heather",
    swatch: "#595959",
    ink: "white",
    variants: { S: 15843, M: 15844, L: 15845, XL: 15846, "2XL": 15847, "3XL": 15848 },
  },
  white: {
    label: "White",
    printful: "White",
    swatch: "#fffefa",
    ink: "ink",
    variants: { S: 11576, M: 11577, L: 11578, XL: 11579, "2XL": 11580, "3XL": 12650 },
  },
};

export interface TeeDesign {
  id: TeeDesignId;
  name: string;
  /** The colour it's shown in first, in the shop grid and the sheet. */
  defaultColor: TeeColor;
  /** What's printed where, for the shop. */
  detail: string;
}

export const TEE_DESIGNS: TeeDesign[] = [
  {
    id: "big-s",
    name: "Big S",
    defaultColor: "black",
    detail: "SORZA wordmark on the chest, the S and “The social network for car enthusiasts” on the back",
  },
  {
    id: "built-rated-ranked",
    name: "Built. Rated. Ranked.",
    defaultColor: "white",
    detail: "S on the chest, the S and “Built. Rated. Ranked.” on the back",
  },
  {
    id: "wordmark",
    name: "Wordmark",
    defaultColor: "grey",
    detail: "S on the chest, SORZA across the back",
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

export function isTeeColor(color: string): color is TeeColor {
  return (TEE_COLORS as readonly string[]).includes(color);
}

export function teePriceCents(size: TeeSize): number {
  return PRICE_CENTS[size];
}

/** The starting price, for the shelf. */
export const TEE_FROM_CENTS = Math.min(...Object.values(PRICE_CENTS));

/** A design, size and colour as one orderable line, or null if any of
 * them isn't sold. */
export function teeOrderLine(
  designId: string,
  size: string,
  color: string,
): { design: TeeDesign; size: TeeSize; color: TeeColor; variantId: number; priceCents: number } | null {
  const design = teeById(designId);
  if (!design || !isTeeSize(size) || !isTeeColor(color)) return null;
  return { design, size, color, variantId: TEE_COLOR_INFO[color].variants[size], priceCents: PRICE_CENTS[size] };
}

/** An order's colour from the Printful variant saved on it. */
export function teeColorForVariant(variantId: number): TeeColor | null {
  return TEE_COLORS.find((c) => Object.values(TEE_COLOR_INFO[c].variants).includes(variantId)) ?? null;
}

/** The print files Printful downloads: the front and back of the design,
 * in the ink that shows on that shirt. */
export function teePrintFiles(designId: TeeDesignId, color: TeeColor, siteUrl: string): { type: "front" | "back"; url: string }[] {
  const ink = TEE_COLOR_INFO[color].ink;
  return (["front", "back"] as const).map((type) => ({ type, url: `${siteUrl}/merch/print/${designId}-${type}-${ink}.png` }));
}

/** Transparent cut-outs of the shirt (front and back, aligned), for the
 * shop's 3D turntable. Made from Printful's own Gildan 5000 template. */
export function teePhotos3d(designId: TeeDesignId, color: TeeColor): { front: string; back: string } {
  return { front: `/merch/3d/${designId}-${color}-front.webp`, back: `/merch/3d/${designId}-${color}-back.webp` };
}

/** The same cut-outs at 3292x3916, for the full-screen viewer: the shirt
 * scaled up from Printful's template, the design from the print files at
 * full detail, so the print stays sharp when zoomed. Same framing as
 * teePhotos3d, so one can stand in for the other while it loads. */
export function teePhotos4k(designId: TeeDesignId, color: TeeColor): { front: string; back: string } {
  return { front: `/merch/4k/${designId}-${color}-front.webp`, back: `/merch/4k/${designId}-${color}-back.webp` };
}

/** Whether tees can be sold right now: switched on (MERCH_ENABLED; admins
 * can test before that), with Stripe to take the money and a Printful
 * token to print. Never take a payment that can't be fulfilled. */
export function merchEnabled(isAdmin = false): boolean {
  const on = process.env.MERCH_ENABLED === "true" || isAdmin;
  return on && Boolean(process.env.STRIPE_SECRET_KEY && process.env.PRINTFUL_API_TOKEN);
}
