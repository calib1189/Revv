-- REVV V14: Stripe-ready subscription tracking. This table only ever
-- gets written by the webhook handler (service role) — the client never
-- writes payment state directly, matching "money is handled server-side
-- only" from the invariants.

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  status text not null default 'incomplete' check (
    status in ('incomplete', 'active', 'past_due', 'canceled', 'unpaid')
  ),
  price_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table subscriptions enable row level security;

create policy "users read their own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- No insert/update/delete policy: only the webhook handler (service
-- role, bypasses RLS) ever writes subscription state. A user's own
-- session can never grant itself a subscription.
