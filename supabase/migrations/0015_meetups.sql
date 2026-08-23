-- Car meets / local events. A meetup is a simple, host-owned listing —
-- title, description, a text location, optional coordinates (captured via
-- the browser's geolocation when the host chooses to, never guessed), and
-- a start time. Distance-based "near you" sorting happens client-side from
-- the viewer's own geolocation against these coordinates; no server-side
-- geocoding or mapping dependency is introduced.

create table meetups (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 2000),
  location_name text not null check (char_length(location_name) between 1 and 200),
  lat double precision check (lat is null or (lat >= -90 and lat <= 90)),
  lng double precision check (lng is null or (lng >= -180 and lng <= 180)),
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table meetups enable row level security;

create policy "meetups are publicly readable"
  on meetups for select
  using (true);

create policy "hosts manage their own meetups"
  on meetups for all
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

create index meetups_starts_at_idx on meetups (starts_at);
