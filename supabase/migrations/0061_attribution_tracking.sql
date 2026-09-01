-- Closes the gap flagged when Creator Studio shipped: "which post drove
-- this profile visit / garage visit" wasn't trackable at all, since
-- nothing recorded that a profile or vehicle page visit happened, let
-- alone where it came from. Same append-only event-log shape as
-- post_views (0017) — counts computed from real rows at read time,
-- never a denormalized column. source_post_id is nullable and set only
-- when the visit was reached via a `?from=<postId>` link from a post
-- (see swipe-slide.tsx / post-card.tsx) — most visits (a direct link, a
-- search result, typing a username) have no post to attribute to,
-- which is a real, honest "unknown source", not an error.

create table profile_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references profiles (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  source_post_id uuid references posts (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table profile_visits enable row level security;

create policy "profile visits are publicly readable"
  on profile_visits for select
  using (true);

create policy "users record their own profile visits"
  on profile_visits for insert
  with check (auth.uid() = visitor_id);

create index profile_visits_source_post_id_idx on profile_visits (source_post_id);

create table vehicle_views (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references profiles (id) on delete cascade,
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  source_post_id uuid references posts (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table vehicle_views enable row level security;

create policy "vehicle views are publicly readable"
  on vehicle_views for select
  using (true);

create policy "users record their own vehicle views"
  on vehicle_views for insert
  with check (auth.uid() = viewer_id);

create index vehicle_views_source_post_id_idx on vehicle_views (source_post_id);
