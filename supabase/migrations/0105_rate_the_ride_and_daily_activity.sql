-- Sorza Daily, part 3: Rate the Ride and daily participation. Run after
-- 0104.
--
-- rate_ride_rounds: the three cars someone gets on a given day, fixed for
-- that day so refreshing never deals a different hand. The ratings
-- themselves go into peer_ratings (0074), the same community ratings the
-- garage page shows.
--
-- daily_activity: one row per person, day and kind of participation
-- (entered, voted, rated their rides, placed). Streaks are computed from
-- these rows when they're read, never stored. Points for each kind are
-- paid at most once per day through points_ledger's own unique key.
--
-- Both are written only by the server (service role) after it has
-- checked the activity really happened.

create table rate_ride_rounds (
  user_id uuid not null references profiles (id) on delete cascade,
  round_date date not null,
  vehicle_ids uuid[] not null check (cardinality(vehicle_ids) <= 3),
  created_at timestamptz not null default now(),
  primary key (user_id, round_date)
);

alter table rate_ride_rounds enable row level security;

create policy "users see their own rides"
  on rate_ride_rounds for select
  using (auth.uid() = user_id);

create table daily_activity (
  user_id uuid not null references profiles (id) on delete cascade,
  activity_date date not null,
  kind text not null check (kind in ('entered', 'voted', 'rated_rides', 'placed')),
  created_at timestamptz not null default now(),
  primary key (user_id, activity_date, kind)
);

create index daily_activity_user_idx on daily_activity (user_id, activity_date desc);

alter table daily_activity enable row level security;

create policy "users see their own daily activity"
  on daily_activity for select
  using (auth.uid() = user_id);

alter table points_ledger drop constraint if exists points_ledger_source_type_check;
alter table points_ledger add constraint points_ledger_source_type_check
  check (source_type in ('achievement', 'challenge', 'purchase', 'admin_grant', 'daily'));
