-- Peer ratings — a completely separate signal from the AI's REVV
-- Rating: a simple 1-5 star opinion from another person, not an AI
-- score and not something the owner has to confirm (same reasoning
-- likes/comments don't need owner approval either). One row per
-- (vehicle, rater) — a rater can change their mind later, hence
-- updated_at and an upsert-shaped write pattern, not append-only like
-- the AI rating history.
--
-- The aggregate (average stars, rating count) is deliberately NOT
-- stored anywhere — computed at read time from these raw rows, the
-- same "aggregates computed, never stored" rule every other derived
-- number in this app follows.
create table peer_ratings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  rater_id uuid not null references profiles (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehicle_id, rater_id)
);

alter table peer_ratings enable row level security;

create index peer_ratings_vehicle_id_idx on peer_ratings (vehicle_id);
create index peer_ratings_rater_id_idx on peer_ratings (rater_id);

-- Public, same as likes/comments — a community signal anyone can see.
create policy "peer ratings are publicly readable"
  on peer_ratings for select using (true);

-- Never yourself: a peer rating is explicitly a third party's opinion.
-- The app layer also checks this up front for a friendlier error, but
-- the real guard lives here.
create policy "users rate other people's vehicles, never their own"
  on peer_ratings for insert
  with check (
    auth.uid() = rater_id
    and not exists (
      select 1 from vehicles where vehicles.id = peer_ratings.vehicle_id and vehicles.owner_id = auth.uid()
    )
  );

create policy "users change their own peer rating"
  on peer_ratings for update
  using (auth.uid() = rater_id)
  with check (auth.uid() = rater_id);

create policy "users remove their own peer rating"
  on peer_ratings for delete
  using (auth.uid() = rater_id);
