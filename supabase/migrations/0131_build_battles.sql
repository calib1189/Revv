-- Build Battle: one head-to-head a day between two real builds. Run after 0130.
--
-- Each Sorza day (midnight to midnight Central, like the Daily) the
-- hourly job (0107) pairs two approved, scored cars and inserts the day's
-- battle. Anyone confirmed votes once for the better build; the two
-- owners sit their own battle out. Like the Daily, who voted for whom is
-- private and the running count stays hidden until the day ends, so a
-- battle can't snowball from being seen ahead. Then the job settles it:
-- points to the winner's owner and to everyone who called it.
--
-- score_a/score_b are each car's SORZA score when the battle was set,
-- the bar an "upset" is judged against, so a later re-score can't
-- rewrite a past result. Nothing about results is stored: wins, losses
-- and percentages are counted from the votes when they're read.
--
-- Until this runs, the app hides Build Battle (every loader treats a
-- missing table as "no battle"), and nothing else is affected.

create table build_battles (
  id uuid primary key default gen_random_uuid(),
  battle_date date not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  vehicle_a_id uuid not null references vehicles (id) on delete cascade,
  vehicle_b_id uuid not null references vehicles (id) on delete cascade,
  score_a numeric not null,
  score_b numeric not null,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  check (vehicle_a_id <> vehicle_b_id),
  check (ends_at > starts_at)
);

create index build_battles_vehicle_a_idx on build_battles (vehicle_a_id);
create index build_battles_vehicle_b_idx on build_battles (vehicle_b_id);

alter table build_battles enable row level security;

-- Public once it has started. Written only by the server (service role).
create policy "battles are public once they start"
  on build_battles for select
  using (starts_at <= now());

create table build_battle_votes (
  battle_id uuid not null references build_battles (id) on delete cascade,
  voter_id uuid not null references profiles (id) on delete cascade,
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (battle_id, voter_id)
);

create index build_battle_votes_battle_vehicle_idx on build_battle_votes (battle_id, vehicle_id);

alter table build_battle_votes enable row level security;

create policy "voters see their own battle vote"
  on build_battle_votes for select
  using (auth.uid() = voter_id);

-- Confirmed, not banned, battle open now, the pick is one of its two
-- cars, and neither car is the voter's own. One vote, no changes.
create policy "users vote in today's battle"
  on build_battle_votes for insert
  with check (
    auth.uid() = voter_id
    and public.is_confirmed_user()
    and not exists (select 1 from profiles where id = auth.uid() and is_banned)
    and exists (
      select 1 from build_battles b
      where b.id = battle_id
        and now() >= b.starts_at and now() < b.ends_at
        and vehicle_id in (b.vehicle_a_id, b.vehicle_b_id)
        and not exists (
          select 1 from vehicles v
          where v.id in (b.vehicle_a_id, b.vehicle_b_id) and v.owner_id = auth.uid()
        )
    )
  );

-- Votes per car for the given battles, only once each has ended.
create or replace function public.build_battle_counts(p_battle_ids uuid[])
returns table (battle_id uuid, vehicle_id uuid, votes bigint)
language sql
security definer set search_path = public
stable
as $$
  select v.battle_id, v.vehicle_id, count(*)
  from build_battle_votes v
  join build_battles b on b.id = v.battle_id
  where v.battle_id = any (p_battle_ids) and b.ends_at <= now()
  group by v.battle_id, v.vehicle_id;
$$;

-- Total votes cast in a battle, any time: shows it's live without
-- giving away who's ahead.
create or replace function public.build_battle_vote_total(p_battle_id uuid)
returns bigint
language sql
security definer set search_path = public
stable
as $$
  select count(*) from build_battle_votes where battle_id = p_battle_id;
$$;

revoke all on function public.build_battle_counts(uuid[]) from public;
revoke all on function public.build_battle_vote_total(uuid) from public;
grant execute on function public.build_battle_counts(uuid[]) to anon, authenticated, service_role;
grant execute on function public.build_battle_vote_total(uuid) to anon, authenticated, service_role;

-- The owners' "your car is in today's battle" push and the winner's
-- result push, logged like the Daily's so overlapping runs send once.
alter table daily_push_log drop constraint if exists daily_push_log_kind_check;
alter table daily_push_log add constraint daily_push_log_kind_check
  check (kind in ('morning', 'evening', 'vote', 'rank', 'add_car', 'rate_car', 'drop', 'battle'));

-- Skipping the line: an owner spends points so their car leads the next
-- battle. It buys the slot, never the result: the opponent is still the
-- closest score, and the votes are the votes. One open spot per car; the
-- server limits a car to one a week and refunds a spot not used within
-- three days (the charge is removed, like a failed re-rate). Written
-- only by the server (service role) after it has checked the balance.
create table build_battle_priority (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  points integer not null check (points > 0),
  battle_id uuid references build_battles (id) on delete set null,
  refunded_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index build_battle_priority_open_idx
  on build_battle_priority (vehicle_id)
  where battle_id is null and refunded_at is null;
create index build_battle_priority_vehicle_idx on build_battle_priority (vehicle_id, created_at desc);

alter table build_battle_priority enable row level security;

create policy "owners see their own battle spots"
  on build_battle_priority for select
  using (auth.uid() = user_id);

alter table points_ledger drop constraint if exists points_ledger_source_type_check;
alter table points_ledger add constraint points_ledger_source_type_check
  check (source_type in ('achievement', 'challenge', 'purchase', 'admin_grant', 'daily', 'points_pack', 'points_refund', 'instant_rerate', 'referral', 'battle_priority'));
