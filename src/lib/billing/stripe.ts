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

export async function createCheckoutSession({
  customerEmail,
  userId,
  successUrl,
  cancelUrl,
}: {
  customerEmail: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string | null }> {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PRICE_ID is not configured.");

  const session = await stripeRequest<{ url: string | null }>(
    "/checkout/sessions",
    {
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      "metadata[user_id]": userId,
    },
  );
  return session;
}

/**
 * A single one-time charge (mode: "payment", not "subscription") for an
 * ad campaign — no STRIPE_PRICE_ID involved, since the price is
 * per-campaign (its tier's price_cents, looked up server-side in
 * ad-campaigns.ts's AD_TIERS, never trusted from the client) rather
 * than one fixed recurring price like the Pro subscription.
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
      "line_items[0][price_data][product_data][name]": `REVV ad: ${headline}`,
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
      "line_items[0][price_data][product_data][name]": `REVV meetup: ${title}`,
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
 * category on the Discover page — same dynamic price_data shape as the
 * ad campaign and meetup checkouts, just a flat price/duration instead
 * of a tier lookup (see SHOP_PROMOTION_PRICE_CENTS in shop-promotions.ts).
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
      "line_items[0][price_data][product_data][name]": `REVV shop promotion: ${placeName}`,
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
