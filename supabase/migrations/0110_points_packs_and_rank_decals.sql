-- Real-money points and rank decals. Run after 0109.
--
-- Points packs: points bought with real money (Apple in-app purchase in
-- the iPhone app, Stripe on the web). Each purchase is one row in
-- points_purchases, unique per provider transaction, and credits the
-- ledger once under source_type 'points_pack' with that row's id. A
-- refund adds a matching negative 'points_refund' row. Cosmetics are
-- still bought with points exactly as before, and every one of them can
-- still be earned for free.
--
-- Rank decals: a physical sticker of the rank a car earned, printed and
-- shipped by a print-on-demand partner. One row per order. The shipping
-- address goes from Stripe straight to the printer and isn't stored here.
--
-- Both tables are written only by the server (service role): payment
-- providers are the source of truth, never the client. Owners can read
-- their own rows.

alter table points_ledger drop constraint if exists points_ledger_source_type_check;
alter table points_ledger add constraint points_ledger_source_type_check
  check (source_type in ('achievement', 'challenge', 'purchase', 'admin_grant', 'daily', 'points_pack', 'points_refund'));

create table points_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  provider text not null check (provider in ('apple', 'stripe')),
  -- Apple's transactionId, or the Stripe Checkout session id.
  provider_ref text not null check (char_length(provider_ref) between 1 and 200),
  pack_id text not null check (char_length(pack_id) between 1 and 40),
  points integer not null check (points > 0),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd' check (char_length(currency) between 3 and 3),
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_ref)
);

alter table points_purchases enable row level security;

create policy "users read their own points purchases"
  on points_purchases for select
  using (auth.uid() = user_id);

create index points_purchases_user_idx on points_purchases (user_id, created_at desc);

create table decal_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  vehicle_id uuid references vehicles (id) on delete set null,
  tier text not null check (
    tier in ('bronze', 'copper', 'iron', 'silver', 'gold', 'platinum', 'emerald', 'diamond', 'ruby', 'cosmic')
  ),
  -- The car's score when the order was placed, as the record of what it earned.
  score numeric(5, 2) not null check (score between 0 and 100),
  status text not null default 'awaiting_payment' check (
    status in ('awaiting_payment', 'paid', 'sent_to_printer', 'failed', 'canceled')
  ),
  amount_cents integer not null check (amount_cents >= 0),
  stripe_session_id text unique,
  printer_order_id text,
  -- Why sending to the printer failed, for an admin to follow up on.
  error text check (error is null or char_length(error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table decal_orders enable row level security;

create policy "users read their own decal orders"
  on decal_orders for select
  using (auth.uid() = user_id);

create index decal_orders_user_idx on decal_orders (user_id, created_at desc);
