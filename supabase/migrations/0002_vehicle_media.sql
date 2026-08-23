-- REVV V1: photo storage for the garage.

-- ---------------------------------------------------------------------
-- storage bucket for uploaded media (vehicle photos, avatars, post media)
-- objects are stored under `${auth.uid()}/...` so ownership is checkable
-- straight from the path.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media bucket is publicly readable"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "users upload to their own media folder"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update their own media objects"
  on storage.objects for update
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete their own media objects"
  on storage.objects for delete
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- vehicle_media: ordered photo gallery for a vehicle. hero_media_id on
-- vehicles remains the single "cover" photo; this is the rest of the set.
-- ---------------------------------------------------------------------
create table vehicle_media (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  media_id uuid not null references media (id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (vehicle_id, media_id)
);

alter table vehicle_media enable row level security;

create policy "vehicle_media is publicly readable"
  on vehicle_media for select
  using (true);

create policy "owners manage their own vehicle_media"
  on vehicle_media for all
  using (
    exists (
      select 1 from vehicles
      where vehicles.id = vehicle_media.vehicle_id
        and vehicles.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from vehicles
      where vehicles.id = vehicle_media.vehicle_id
        and vehicles.owner_id = auth.uid()
    )
  );
