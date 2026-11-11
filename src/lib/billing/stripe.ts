// Direct REST calls against the Stripe API instead of the `stripe` npm
// package — adding a dependency needs sign-off first, and Stripe's API is
// plain HTTPS + form-encoded bodies, so no SDK is required for this.
// Server-only: never import this from a "use client" component.

import crypto from "node:crypto";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

async function stripeRequest<T>(
  path: string,
  body: Record<string, string>,
): Promise<T> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured.");

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Stripe request failed (${response.status}): ${errorBody}`);
  }
  return response.json() as Promise<T>;
}

/**
 * A single one-time charge (mode: "payment", not "subscription") for an
 * ad campaign — the price is per-campaign (its tier's price_cents,
 * looked up server-side in ad-campaigns.ts's AD_TIERS, never trusted
 * from the client), via Stripe's dynamic price_data rather than a fixed
 * STRIPE_PRICE_ID.
 */
export async function createAdCheckoutSession({
  campaignId,
  headline,
  priceCents,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  campaignId: string;
  headline: string;
  priceCents: number;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string | null }> {
  const session = await stripeRequest<{ url: string | null }>(
    "/checkout/sessions",
    {
      mode: "payment",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]": `SORZA ad: ${headline}`,
      "line_items[0][price_data][unit_amount]": String(priceCents),
      "line_items[0][quantity]": "1",
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      "metadata[type]": "ad_campaign",
      "metadata[campaign_id]": campaignId,
    },
  );
  return session;
}

/**
 * A single one-time charge for a meetup listing — mirrors
 * createAdCheckoutSession exactly (dynamic price_data by tier, no fixed
 * STRIPE_PRICE_ID) since the price depends on which tier (standard vs.
 * promoted) the host picked, looked up server-side in meetups.ts's
 * MEETUP_TIERS.
 */
export async function createMeetupCheckoutSession({
  meetupId,
  title,
  priceCents,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  meetupId: string;
  title: string;
  priceCents: number;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string | null }> {
  const session = await stripeRequest<{ url: string | null }>(
    "/checkout/sessions",
    {
      mode: "payment",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]": `SORZA meetup: ${title}`,
      "line_items[0][price_data][unit_amount]": String(priceCents),
      "line_items[0][quantity]": "1",
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      "metadata[type]": "meetup",
      "metadata[meetup_id]": meetupId,
    },
  );
  return session;
}

/**
 * A single one-time charge to promote a shop listing to the top of its
 * category on the Discover page — same dynamic price_data shape and same
 * tier-lookup pattern (see SHOP_PROMOTION_TIERS in shop-promotions.ts) as
 * the ad campaign and meetup checkouts.
 */
export async function createShopPromotionCheckoutSession({
  promotionId,
  placeName,
  priceCents,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  promotionId: string;
  placeName: string;
  priceCents: number;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string | null }> {
  const session = await stripeRequest<{ url: string | null }>(
    "/checkout/sessions",
    {
      mode: "payment",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]": `SORZA shop promotion: ${placeName}`,
      "line_items[0][price_data][unit_amount]": String(priceCents),
      "line_items[0][quantity]": "1",
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      "metadata[type]": "shop_promotion",
      "metadata[promotion_id]": promotionId,
    },
  );
  return session;
}

/**
 * Verifies the Stripe-Signature header per Stripe's documented webhook
 * signing scheme: HMAC-SHA256 of "{timestamp}.{payload}" using the
 * webhook signing secret, compared with a constant-time check.
 */
export function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => part.split("=") as [string, string]),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

async function stripeGet<T>(path: string): Promise<T> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured.");
  const response = await fetch(`${STRIPE_API_BASE}${path}`, { headers: { Authorization: `Bearer ${secretKey}` } });
  if (!response.ok) throw new Error(`Stripe request failed (${response.status}): ${await response.text()}`);
  return response.json() as Promise<T>;
}

/** A points pack on the web. The pack (and so its price and points) is
 * looked up server-side from its id; the webhook credits the points. */
export async function createPointsCheckoutSession({
  userId,
  packId,
  points,
  priceCents,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  packId: string;
  points: number;
  priceCents: number;
  customerEmail: string | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string | null }> {
  return stripeRequest<{ url: string | null }>("/checkout/sessions", {
    mode: "payment",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][product_data][name]": `${points.toLocaleString("en-US")} SORZA points`,
    "line_items[0][price_data][unit_amount]": String(priceCents),
    "line_items[0][quantity]": "1",
    ...(customerEmail ? { customer_email: customerEmail } : {}),
    success_url: successUrl,
    cancel_url: cancelUrl,
    "metadata[type]": "points_pack",
    "metadata[user_id]": userId,
    "metadata[pack_id]": packId,
    "payment_intent_data[metadata][type]": "points_pack",
  });
}

/** A printed rank decal: a physical product, shipped in the US. */
export async function createDecalCheckoutSession({
  orderId,
  tierLabel,
  priceCents,
  imageUrl,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  orderId: string;
  tierLabel: string;
  priceCents: number;
  imageUrl: string;
  customerEmail: string | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string | null }> {
  return stripeRequest<{ id: string; url: string | null }>("/checkout/sessions", {
    mode: "payment",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][product_data][name]": `SORZA ${tierLabel} rank decal`,
    "line_items[0][price_data][product_data][description]": "4 in. vinyl sticker. Free US shipping.",
    "line_items[0][price_data][product_data][images][0]": imageUrl,
    "line_items[0][price_data][unit_amount]": String(priceCents),
    "line_items[0][quantity]": "1",
    "shipping_address_collection[allowed_countries][0]": "US",
    ...(customerEmail ? { customer_email: customerEmail } : {}),
    success_url: successUrl,
    cancel_url: cancelUrl,
    "metadata[type]": "rank_decal",
    "metadata[order_id]": orderId,
  });
}

export async function createPosterCheckoutSession({
  orderId,
  name,
  description,
  priceCents,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  orderId: string;
  name: string;
  description: string;
  priceCents: number;
  customerEmail: string | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string | null }> {
  return stripeRequest<{ id: string; url: string | null }>("/checkout/sessions", {
    mode: "payment",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][product_data][name]": name,
    "line_items[0][price_data][product_data][description]": description,
    "line_items[0][price_data][unit_amount]": String(priceCents),
    "line_items[0][quantity]": "1",
    "shipping_address_collection[allowed_countries][0]": "US",
    ...(customerEmail ? { customer_email: customerEmail } : {}),
    success_url: successUrl,
    cancel_url: cancelUrl,
    "metadata[type]": "build_poster",
    "metadata[order_id]": orderId,
  });
}

/** The Checkout session behind a payment, for tying a refund back to
 * what was bought. */
export async function findCheckoutSessionByPaymentIntent(paymentIntentId: string): Promise<{ id: string; metadata: Record<string, string> } | null> {
  const list = await stripeGet<{ data: { id: string; metadata: Record<string, string> }[] }>(
    `/checkout/sessions?payment_intent=${encodeURIComponent(paymentIntentId)}&limit=1`,
  );
  return list.data[0] ?? null;
}
