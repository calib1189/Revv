-- Anyone can pay to promote a shop to the top of its category results on
-- the Discover page's "Shops near you" tab — not just the shop's owner.
-- Shops come from Google, not a REVV account, so there's no ownership to
-- verify here; this is closer to a paid keyword placement than a claimed-
-- business feature. Same "money handled server-side only" pattern as
-- ad_campaigns/meetups: a promoter's own session can only insert a
-- promotion in the unpaid draft state, and can never move it out of that
-- state itself — only the Stripe webhook (service role) can activate it.
--
-- One flat price/duration, no tiers — this is meant to be a fast, no-
-- decision "pay to be seen" action from right on the shop's card, not a
-- form with choices.

create table shop_promotions (
  id uuid primary key default gen_random_uuid(),
  promoter_id uuid not null references profiles (id) on delete cascade,
  -- Google's place_id, plus a snapshot of the name for display in a
  -- future "my promotions" list and for the Stripe line item — there's
  -- no local `shops` table to join against, since the listings
  -- themselves are never REVV-hosted data.
  place_id text not null,
  place_name text not null,
  price_cents int not null,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'active')),
  stripe_checkout_session_id text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table shop_promotions enable row level security;

create policy "active shop promotions are publicly readable"
  on shop_promotions for select
  using (status = 'active');

create policy "promoters read their own shop promotions"
  on shop_promotions for select
  using (auth.uid() = promoter_id);

-- The only thing a promoter's own session can ever insert is their own
-- brand-new, unpaid draft — never anything already active.
create policy "promoters create their own draft promotion"
  on shop_promotions for insert
  with check (auth.uid() = promoter_id and status = 'pending_payment');

-- Deliberately no update or delete policy for the promoter at all —
-- payment confirmation (pending_payment -> active) happens in the Stripe
-- webhook via the service role, which bypasses RLS entirely.

create index shop_promotions_place_id_idx on shop_promotions (place_id);
create index shop_promotions_status_idx on shop_promotions (status);
