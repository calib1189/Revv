/**
 * The printed build posters: the car's own cover photo with its SORZA
 * score, rank and category scores, printed and shipped by Printful.
 * Prices are what the buyer pays, US shipping included. Printful's
 * costs, before sales tax, with its flat $4.99 US shipping (Nov 2026
 * catalog): $16.10 for the 12x16 matte, $18.14 for the 18x24 matte,
 * and $43.66 for the framed 12x18 (its shipping is $10.89).
 */
export type PosterProductId = "poster_12x16" | "poster_18x24" | "framed_12x18";

export interface PosterProduct {
  id: PosterProductId;
  /** Short, for the size picker. */
  name: string;
  detail: string;
  /** In full, for checkout, orders and receipts. */
  label: string;
  /** Printful catalog variant. */
  variantId: number;
  priceCents: number;
  widthIn: number;
  heightIn: number;
}

export const POSTER_PRODUCTS: PosterProduct[] = [
  {
    id: "poster_12x16",
    name: "12 × 16",
    detail: "Matte poster",
    label: "12 × 16 in. matte poster",
    variantId: 1349,
    priceCents: 2499,
    widthIn: 12,
    heightIn: 16,
  },
  {
    id: "poster_18x24",
    name: "18 × 24",
    detail: "Matte poster",
    label: "18 × 24 in. matte poster",
    variantId: 1,
    priceCents: 2999,
    widthIn: 18,
    heightIn: 24,
  },
  {
    id: "framed_12x18",
    name: "Framed",
    detail: "12 × 18, black frame",
    label: "12 × 18 in. framed poster, black frame",
    variantId: 4398,
    priceCents: 5999,
    widthIn: 12,
    heightIn: 18,
  },
];

export function posterProductById(id: string): PosterProduct | undefined {
  return POSTER_PRODUCTS.find((p) => p.id === id);
}

/** The print file's resolution: Printful's own 300 DPI, so the logo,
 * score and type print razor sharp. An 18x24 file renders in about 12
 * seconds and comes to about 40 MB. */
export const PRINT_DPI = 300;

/** The poster is laid out on a grid 1800 units wide (poster-art.tsx);
 * everything below the photo takes the bottom 500 units. */
export const LAYOUT_WIDTH = 1800;
export const LAYOUT_BELOW_PHOTO = 500;

export function printPixels(product: PosterProduct, dpi = PRINT_DPI): { width: number; height: number } {
  return { width: Math.round(product.widthIn * dpi), height: Math.round(product.heightIn * dpi) };
}

/** Inches of photo on the printed poster: the full width, and the
 * height down to where the score block takes over. */
function photoArea(product: PosterProduct): { widthIn: number; heightIn: number } {
  const belowIn = (LAYOUT_BELOW_PHOTO / LAYOUT_WIDTH) * product.widthIn;
  return { widthIn: product.widthIn, heightIn: product.heightIn - belowIn };
}

export interface PhotoSize {
  width: number | null;
  height: number | null;
}

/** How many of the photo's pixels land on each printed inch, once it's
 * cropped to fill the poster's photo area (the tighter of the two
 * directions wins). */
export function effectivePhotoDpi(photo: { width: number; height: number }, product: PosterProduct): number {
  const area = photoArea(product);
  return Math.min(photo.width / area.widthIn, photo.height / area.heightIn);
}

/** Whether the cover photo prints sharp at this size: at least 100
 * pixels per printed inch. Never sell a poster that comes out blurry. */
export const MIN_PHOTO_DPI = 100;

export function photoPrintsSharp(photo: PhotoSize | null, product: PosterProduct): boolean {
  if (!photo?.width || !photo.height) return false;
  return effectivePhotoDpi({ width: photo.width, height: photo.height }, product) >= MIN_PHOTO_DPI;
}

/** Whether posters can be sold right now: switched on (POSTERS_ENABLED;
 * admins can test before that), with Stripe to take the money and a
 * Printful token to print. Never take a payment that can't be fulfilled. */
export function postersEnabled(isAdmin = false): boolean {
  const on = process.env.POSTERS_ENABLED === "true" || isAdmin;
  return on && Boolean(process.env.STRIPE_SECRET_KEY && process.env.PRINTFUL_API_TOKEN);
}
