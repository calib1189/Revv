/** Env-gated per the roadmap: monetization stays entirely off, with no
 * checkout flow shown, until a real Stripe key is configured. Every paid
 * feature (ads, meetups, shop promotions) uses Stripe's dynamic
 * price_data rather than a fixed STRIPE_PRICE_ID, so the secret key
 * alone is what gates all of them. */
export function isAdBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Same reasoning as isAdBillingConfigured — meetup checkout also uses
 * dynamic price_data keyed by tier, not STRIPE_PRICE_ID. */
export function isMeetupBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Same reasoning again — shop promotion checkout is a flat dynamic
 * price_data charge, not STRIPE_PRICE_ID. */
export function isShopPromotionBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
