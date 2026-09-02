-- "See how your rating changes as your build evolves" — until now,
-- re-rating a build overwrote ai_rating_score/strengths/etc in place
-- (updateBuildRating), so there was never a record of what a build
-- scored last month. This is a real historical log of confirmed
-- ratings, not a computed aggregate — every row here is a specific
-- "AI proposed, owner confirmed" event (see confirmBuildRatingAction),
-- worth keeping exactly as it happened, the same reasoning maintenance
-- records already get. Append-only: no update/delete policy at all.
create table build_rating_history (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references builds (id) on delete cascade,
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  subscores jsonb,
  strengths text not null,
  limiting_factors text not null,
  is_mock boolean not null default false,
  rated_at timestamptz not null default now()
);

alter table build_rating_history enable row level security;

create index build_rating_history_build_id_idx on build_rating_history (build_id, rated_at desc);

-- Ratings are already public (builds/vehicles have no privacy concept),
-- so their history is too.
create policy "build rating history is publicly readable"
  on build_rating_history for select using (true);

-- Only the vehicle's owner may log a rating for their own build — same
-- ownership check confirmBuildRatingAction's requireOwner already
-- enforces in application code, mirrored here at the RLS layer.
create policy "owners insert their own build's rating history"
  on build_rating_history for insert
  with check (
    exists (
      select 1 from builds
      join vehicles on vehicles.id = builds.vehicle_id
      where builds.id = build_rating_history.build_id
        and vehicles.owner_id = auth.uid()
    )
  );
