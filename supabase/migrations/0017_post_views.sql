-- Post view counts. Computed from real rows, never a denormalized counter
-- column on posts (same pattern as likes/comments). One row per
-- (post, viewer) — a view is a one-time fact, counts unique viewers rather
-- than replay counts, and only logged-in views are recorded (keeps
-- anonymous view-count inflation off the table entirely rather than
-- needing separate abuse mitigation for it).

create table post_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  viewer_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, viewer_id)
);

alter table post_views enable row level security;

create policy "post views are publicly readable"
  on post_views for select
  using (true);

create policy "users record their own views"
  on post_views for insert
  with check (auth.uid() = viewer_id);

create index post_views_post_id_idx on post_views (post_id);
