-- Streak repairs: days someone paid to fill after missing them. Run after 0132.
--
-- Missing a day or two breaks a streak (lib/daily/streak.ts). Within a
-- few days of losing one, its owner can restore it for points
-- (lib/streak/repair.ts): the days they missed are written here, and the
-- streak treats them as covered, joining the run back up. A repaired day
-- doesn't count toward the streak's length or earn its track points; it
-- only stops the gap from breaking the run. Nothing about the streak
-- itself is stored: it's still worked out from activity, plus these.
--
-- The charge is a points_ledger row of the new type 'streak_repair'.
-- Until this runs, restoring isn't offered, and nothing else is affected.

create table streak_repairs (
  user_id uuid not null references profiles (id) on delete cascade,
  repaired_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, repaired_date)
);

alter table streak_repairs enable row level security;

-- Your own repairs only. Written only by the server (service role), after
-- it has checked the offer and taken the points.
create policy "users read their own streak repairs"
  on streak_repairs for select
  using (auth.uid() = user_id);

alter table points_ledger drop constraint if exists points_ledger_source_type_check;
alter table points_ledger add constraint points_ledger_source_type_check
  check (source_type in ('achievement', 'challenge', 'purchase', 'admin_grant', 'daily', 'points_pack', 'points_refund', 'instant_rerate', 'referral', 'battle_priority', 'streak_repair'));
