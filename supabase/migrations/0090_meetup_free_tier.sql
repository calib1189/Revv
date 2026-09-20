-- Hosting a meet is free now; the paid tiers become pure promotion.
--
-- Two reasons, one product and one platform. Charging $10 just to post a
-- cars & coffee made the paid tiers the price of entry rather than an
-- upgrade, which is the wrong default for the thing that's supposed to
-- get people out to meets in the first place.
--
-- And on iOS, every single meetup creation had to hand off to the website
-- (see createWebHandoffAction in features/auth/actions.ts): a tier buys
-- placement inside the app, which Apple requires In-App Purchase for, so
-- no purchase flow can be presented from inside the app at all. A free
-- listing involves no purchase, so it can be created entirely in the app.
-- Paid promotion still hands off, unchanged.

alter table meetups drop constraint meetups_tier_check;
alter table meetups add constraint meetups_tier_check
  check (tier in ('free', 'standard', 'promoted', 'diamond'));

-- A host still cannot self-publish. A free meetup goes straight into the
-- same admin review queue a paid one lands in once its webhook fires —
-- 'pending_review', never 'active'. The 0043 policy pinning new rows to
-- 'pending_payment' stays exactly as it is and continues to cover every
-- paid tier; this is a second, narrower insert policy beside it, and the
-- tier/price_cents conditions are what stop it being a way to skip
-- payment on a promoted listing.
create policy "hosts create their own free meetup for review"
  on meetups for insert
  with check (
    auth.uid() = host_id
    and status = 'pending_review'
    and tier = 'free'
    and price_cents = 0
  );
