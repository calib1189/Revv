-- Web Push subscription endpoints. A user can have more than one (each
-- device/browser they've enabled notifications on gets its own row).
-- Reads/writes are owner-only from the client — sending a push to someone
-- else's subscriptions happens server-side via the service-role client,
-- same pattern as delete-account.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "users manage their own push subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index push_subscriptions_user_id_idx on push_subscriptions (user_id);
