/** Env-gated per the roadmap: monetization stays entirely off, with no
 * checkout flow shown, until real Stripe keys are configured. */
export function isBillingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID,
  );
}
