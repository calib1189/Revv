/** Env-gated per the roadmap: monetization stays entirely off, with no
 * checkout flow shown, until real Stripe keys are configured. */
export function isBillingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID,
  );
}

/** Ads use Stripe's dynamic price_data (a different price per campaign
 * tier) instead of one fixed recurring STRIPE_PRICE_ID, so they only
 * need the secret key — gating them on STRIPE_PRICE_ID too would block
 * ad checkout on an env var that has nothing to do with it. */
export function isAdBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
