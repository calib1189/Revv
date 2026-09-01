-- Tracks a click on a build_part's Buy button, so the owner can see how
-- much interest a listed mod is actually getting. Every click counts, not
-- just the first (same reasoning as post_shares — a deliberate action,
-- not a passive replayable view, so no cooldown/dedupe is needed). Only
-- logged-in clicks are recorded, matching post_views' anti-inflation
-- convention.

create table part_clicks (
  id uuid primary key default gen_random_uuid(),
  build_part_id uuid not null references build_parts (id) on delete cascade,
  clicker_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table part_clicks enable row level security;

create policy "part clicks are publicly readable"
  on part_clicks for select
  using (true);

create policy "users record their own part clicks"
  on part_clicks for insert
  with check (auth.uid() = clicker_id);

create index part_clicks_build_part_id_idx on part_clicks (build_part_id);
