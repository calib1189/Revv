-- Streak chests: what each seventh-day chest of a streak held. Run after 0131.
--
-- Every seventh day of a streak (Sorza Daily or a Build Battle vote,
-- lib/streak/track.ts) earns a chest. Its prize is drawn once, by the
-- server, the moment the day is earned (lib/streak/chest.ts): points,
-- or a streak-only cosmetic. The draw is recorded here so the owner can
-- open it later and see exactly what it was, and so it's drawn only
-- once however many times that day is rewarded. The prize itself is paid
-- the same way as everything else, to points_ledger or
-- store_items_owned; this table only says what was drawn and whether
-- the owner has opened it yet (opened_at, for the opening animation).
--
-- Until this runs, a chest day pays a flat amount of points instead
-- (lib/daily/rewards.ts) and the app simply has no chest to open.

create table streak_chests (
  user_id uuid not null references profiles (id) on delete cascade,
  chest_date date not null,
  tier text not null check (tier in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  points integer not null default 0 check (points >= 0),
  item_id text,
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, chest_date),
  check ((item_id is null) <> (points = 0))
);

alter table streak_chests enable row level security;

-- Your own chests only. Written only by the server (service role): the
-- draw, and marking one opened, both go through server code that has
-- checked who is asking.
create policy "users read their own streak chests"
  on streak_chests for select
  using (auth.uid() = user_id);
