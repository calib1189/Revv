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

export function printfulConfig() {
  const token = process.env.PRINTFUL_API_TOKEN;
  const variantId = Number(process.env.PRINTFUL_DECAL_VARIANT_ID);
  if (!token || !Number.isInteger(variantId) || variantId <= 0) return null;
  return {
    token,
    variantId,
    storeId: process.env.PRINTFUL_STORE_ID || null,
    autoConfirm: process.env.PRINTFUL_AUTO_CONFIRM === "true",
  };
}

/** Whether decals can be sold right now: switched on (DECALS_ENABLED,
 * flipped once migration 0110 and Printful are set up; admins can test
 * before that), Stripe to take the money and Printful to print. Never
 * take a payment that can't be fulfilled. */
export function decalsEnabled(isAdmin = false): boolean {
  const on = process.env.DECALS_ENABLED === "true" || isAdmin;
  return on && Boolean(process.env.STRIPE_SECRET_KEY && printfulConfig());
}

/** Creates the Printful order and returns its id. */
export async function createPrintfulOrder(input: {
  orderId: string;
  recipient: DecalRecipient;
  fileUrl: string;
  previewName: string;
}): Promise<string> {
  const config = printfulConfig();
  if (!config) throw new Error("Printful is not configured.");
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
      items: [{ variant_id: config.variantId, quantity: 1, name: input.previewName, files: [{ url: input.fileUrl }] }],
    }),
  });
  const body = (await res.json().catch(() => null)) as { result?: { id?: number }; error?: { message?: string } } | null;
  if (!res.ok || !body?.result?.id) {
    throw new Error(`Printful ${res.status}: ${body?.error?.message ?? "order not created"}`);
  }
  return String(body.result.id);
}
