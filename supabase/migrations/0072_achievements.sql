-- Achievements — a real, persisted unlock log (not a computed
-- aggregate): "unlocked tier_diamond on March 5th" is a historical fact
-- that has to be recorded when it happens, the same reasoning
-- build_rating_history already uses. Achievement DEFINITIONS live in
-- code (lib/achievements/catalog.ts), not here — this table only ever
-- stores which of those fixed ids a user has unlocked and when.
-- Append-only: no update/delete policy, an unlock is never revoked.
create table user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

alter table user_achievements enable row level security;

create index user_achievements_user_id_idx on user_achievements (user_id);

-- Achievements are a public trophy case, same as posts/vehicles.
create policy "achievements are publicly readable"
  on user_achievements for select using (true);

create policy "users unlock their own achievements"
  on user_achievements for insert
  with check (auth.uid() = user_id);
