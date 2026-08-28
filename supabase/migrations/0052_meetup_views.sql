-- Meetup view counts, mirroring post_views exactly (same reasoning: no
-- denormalized counter column, only logged-in views are recorded, no
-- unique constraint since every rewatch/revisit counts — the cooldown
-- that prevents over-counting lives in application code, see
-- recordMeetupView in lib/db/meetup-views.ts). This is what lets a host
-- who paid for a Gold meetup actually see whether the promotion is
-- working.

create table meetup_views (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references meetups (id) on delete cascade,
  viewer_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table meetup_views enable row level security;

create policy "meetup views are publicly readable"
  on meetup_views for select
  using (true);

create policy "users record their own meetup views"
  on meetup_views for insert
  with check (auth.uid() = viewer_id);

create index meetup_views_meetup_id_idx on meetup_views (meetup_id);
