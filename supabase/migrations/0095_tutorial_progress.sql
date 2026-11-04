-- The first-time walkthrough. One row per person, written as they move
-- through it: `step` is where to pick up if they leave halfway, and
-- `completed_at` is set once they finish or skip, after which it never
-- starts on its own again, on any device.
--
-- No row means the person has never seen the tour, which is every
-- account that existed before this migration as well as every new
-- signup. That is deliberate: everyone gets it exactly once.
create table tutorial_progress (
  user_id uuid primary key references profiles (id) on delete cascade,
  step smallint not null default 0 check (step between 0 and 6),
  completed_at timestamptz,
  outcome text check (outcome in ('finished', 'skipped')),
  updated_at timestamptz not null default now(),
  -- Finishing and the way it ended are set together, or not at all.
  check ((completed_at is null) = (outcome is null))
);

alter table tutorial_progress enable row level security;

create policy "people read their own tutorial progress"
  on tutorial_progress for select
  using (auth.uid() = user_id);

create policy "people create their own tutorial progress"
  on tutorial_progress for insert
  with check (auth.uid() = user_id);

create policy "people change their own tutorial progress"
  on tutorial_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
