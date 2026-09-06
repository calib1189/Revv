-- Points economy: a ledger, not a stored balance column (same
-- "aggregates computed, never stored" rule every derived number in
-- this app already follows) — the balance is sum(amount) at read
-- time. Every earn is keyed to its real source (an achievement id, or
-- a challenge id + week) so re-running the achievement/challenge check
-- (which already happens on every relevant page visit) can never
-- double-award; the unique constraint is the hard backstop behind the
-- app-layer logic that only calls this once per real new unlock.
create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  amount integer not null check (amount <> 0),
  source_type text not null check (source_type in ('achievement', 'challenge', 'purchase')),
  source_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);

alter table points_ledger enable row level security;
create index points_ledger_user_id_idx on points_ledger (user_id);

create policy "users read their own points ledger"
  on points_ledger for select using (auth.uid() = user_id);

-- Self-insert only, same trust model as user_achievements/
-- user_challenge_completions: the app layer (not RLS) decides when a
-- row is legitimate — an achievement/challenge really newly unlocked,
-- or a purchase whose price came from the server-side catalog, never
-- a client-supplied number.
create policy "users insert their own points ledger rows"
  on points_ledger for insert with check (auth.uid() = user_id);

-- What a user owns, permanently — same shape as user_achievements.
-- Not publicly readable: only the owner's own store page needs to know
-- what they already have. What's actually visible to everyone is just
-- the *equipped* cosmetic (profiles columns below), same as an
-- achievement showcase pin being public while the full unlock list
-- powering it is queried per-viewer.
create table store_items_owned (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  item_id text not null,
  purchased_at timestamptz not null default now(),
  unique (user_id, item_id)
);

alter table store_items_owned enable row level security;
create index store_items_owned_user_id_idx on store_items_owned (user_id);

create policy "users read their own owned items"
  on store_items_owned for select using (auth.uid() = user_id);

create policy "users insert their own owned items"
  on store_items_owned for insert with check (auth.uid() = user_id);

-- Nullable — no cosmetic equipped is the default look. Item ids are
-- the store catalog's own string ids (lib/store/catalog.ts), same
-- "fixed code-defined list, not a database table" relationship the
-- achievement catalog already has to user_achievements.
alter table profiles
  add column equipped_name_color text,
  add column equipped_profile_background text,
  add column equipped_showcase_frame text;
