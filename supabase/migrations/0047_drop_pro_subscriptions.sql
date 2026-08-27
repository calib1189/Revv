-- Removes the "Pro" subscription feature entirely. It was fully-wired
-- payment infrastructure (Stripe Checkout, webhook, RLS-protected status
-- tracking) with no actual feature ever gated behind it — nothing in the
-- app checked whether a user was "Pro" — so a real subscriber would have
-- been charged every month for literally nothing. Removed rather than
-- left dormant, per the decision to not build a Pro feature at all.

drop table if exists subscriptions;
