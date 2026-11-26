-- Points packs bought in the Android app go through Google Play Billing
-- (Google requires it for digital goods there). They're recorded in
-- points_purchases like Apple and Stripe ones, keyed by the Play order id,
-- so the same purchase can only ever be credited once.
alter table points_purchases drop constraint if exists points_purchases_provider_check;
alter table points_purchases add constraint points_purchases_provider_check
  check (provider in ('apple', 'stripe', 'google'));
