-- Weekly challenges — unlike achievements (one-time, forever), a
-- challenge completion is scoped to the week it happened in and resets
-- every Monday (see lib/challenges/week.ts), so the same
-- (user, challenge) pair can complete again in a later week. This table
-- only ever records "did complete this challenge in this week" — the
-- live progress shown before completion is computed straight from real
-- engagement rows (posts/comments/likes/build_rating_history), never
-- stored.
create table user_challenge_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  challenge_id text not null,
  week_start date not null,
  completed_at timestamptz not null default now(),
  unique (user_id, challenge_id, week_start)
);

alter table user_challenge_completions enable row level security;

create index user_challenge_completions_user_id_idx
  on user_challenge_completions (user_id, week_start);

create policy "challenge completions are publicly readable"
  on user_challenge_completions for select using (true);

create policy "users record their own challenge completions"
  on user_challenge_completions for insert
  with check (auth.uid() = user_id);
