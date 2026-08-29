-- Two new engagement signals for the feed's ranking algorithm, neither of
-- which existed before: "watched a video all the way" (distinct from
-- post_views, which only means "was on screen past 60% visible for a
-- moment") and "shared". Same append-only event-log shape as post_views
-- (0017) — counts are computed from real rows at read time, never a
-- denormalized column on posts.

create table post_view_completions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  viewer_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table post_view_completions enable row level security;

create policy "post view completions are publicly readable"
  on post_view_completions for select
  using (true);

create policy "users record their own view completions"
  on post_view_completions for insert
  with check (auth.uid() = viewer_id);

create index post_view_completions_post_id_idx on post_view_completions (post_id);

create table post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  sharer_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table post_shares enable row level security;

create policy "post shares are publicly readable"
  on post_shares for select
  using (true);

create policy "users record their own shares"
  on post_shares for insert
  with check (auth.uid() = sharer_id);

create index post_shares_post_id_idx on post_shares (post_id);
