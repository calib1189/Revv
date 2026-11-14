-- One-time announcements shown when someone opens the app (the first is
-- the invite program, lib/announcements.ts). A row means this person has
-- seen that announcement, on any device, so it never shows again.

create table announcement_views (
  user_id uuid not null references profiles (id) on delete cascade,
  announcement text not null check (char_length(announcement) between 1 and 64),
  seen_at timestamptz not null default now(),
  primary key (user_id, announcement)
);

alter table announcement_views enable row level security;

create policy "people read what they've seen"
  on announcement_views for select
  using (auth.uid() = user_id);

create policy "people mark what they've seen"
  on announcement_views for insert
  with check (auth.uid() = user_id);
