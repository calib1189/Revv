// Server-only. Sends a paid rank-decal order to Printful, which prints
// and ships it. Plain REST calls (no SDK). Configured with:
//   PRINTFUL_API_TOKEN        a private token from Printful's developer portal
//   PRINTFUL_DECAL_VARIANT_ID the sticker variant to print: 24966, the
//                             4x4 in. weatherproof Die-Cut Sticker
//   PRINTFUL_STORE_ID         only if the token covers more than one store
//   PRINTFUL_AUTO_CONFIRM     "true" sends orders straight to production;
//                             otherwise they wait as drafts for approval

export interface DecalRecipient {
  name: string;
  address1: string;
  address2?: string | null;
  city: string;
  stateCode: string;
  zip: string;
  countryCode: string;
  email?: string | null;
}

/** The same shipping address shape serves every printed product. */
export type PrintRecipient = DecalRecipient;

/** The Printful account: token, store and whether orders skip the draft
 * step. Shared by every printed product (decals, posters). */
export function printfulAccount() {
  const token = process.env.PRINTFUL_API_TOKEN;
  if (!token) return null;
  return {
    token,
    storeId: process.env.PRINTFUL_STORE_ID || null,
    autoConfirm: process.env.PRINTFUL_AUTO_CONFIRM === "true",
  };
}

/** The account plus the decal's own sticker variant. */
export function printfulConfig() {
  const account = printfulAccount();
  const variantId = Number(process.env.PRINTFUL_DECAL_VARIANT_ID);
  if (!account || !Number.isInteger(variantId) || variantId <= 0) return null;
  return { ...account, variantId };
}

/** Whether decals can be sold right now: switched on (DECALS_ENABLED,
 * flipped once migration 0110 and Printful are set up; admins can test
 * before that), Stripe to take the money and Printful to print. Never
 * take a payment that can't be fulfilled. */
export function decalsEnabled(isAdmin = false): boolean {
  const on = process.env.DECALS_ENABLED === "true" || isAdmin;
  return on && Boolean(process.env.STRIPE_SECRET_KEY && printfulConfig());
}

/** Creates the Printful order and returns its id. `variantId` is the
 * catalog variant to print; it defaults to the decal sticker. One
 * `fileUrl` prints in the product's default spot; a tee passes `files`
 * instead, one per placement (front, back). */
export async function createPrintfulOrder(input: {
  orderId: string;
  recipient: PrintRecipient;
  fileUrl?: string;
  files?: { type: string; url: string }[];
  previewName: string;
  variantId?: number;
}): Promise<string> {
  const files = input.files ?? (input.fileUrl ? [{ url: input.fileUrl }] : []);
  if (files.length === 0) throw new Error("No print file for the order.");
  const account = printfulAccount();
  const variantId = input.variantId ?? printfulConfig()?.variantId;
  if (!account || !variantId) throw new Error("Printful is not configured.");
  const config = { ...account, variantId };
  const r = input.recipient;
  const res = await fetch(`https://api.printful.com/orders${config.autoConfirm ? "?confirm=true" : ""}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...(config.storeId ? { "X-PF-Store-Id": config.storeId } : {}),
    },
    body: JSON.stringify({
      // Printful caps external ids at 32 characters: the order's uuid without dashes.
      external_id: input.orderId.replace(/-/g, ""),
      recipient: {
        name: r.name,
        address1: r.address1,
        ...(r.address2 ? { address2: r.address2 } : {}),
        city: r.city,
        state_code: r.stateCode,
        country_code: r.countryCode,
        zip: r.zip,
        ...(r.email ? { email: r.email } : {}),
      },
      items: [{ variant_id: config.variantId, quantity: 1, name: input.previewName, files }],
    }),
  });
  const body = (await res.json().catch(() => null)) as { result?: { id?: number }; error?: { message?: string } } | null;
  if (!res.ok || !body?.result?.id) {
    throw new Error(`Printful ${res.status}: ${body?.error?.message ?? "order not created"}`);
  }
  return String(body.result.id);
}
