-- Photos on a meetup listing (the car(s) or the spot), same shape as
-- post_media: a join table over the shared `media` table, ordered by
-- position. Read is public (meetups are public listings); writes are
-- restricted to the meetup's host via a subquery against meetups, mirroring
-- the "hosts manage their own meetups" policy.

create table meetup_media (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references meetups (id) on delete cascade,
  media_id uuid not null references media (id) on delete cascade,
  position int not null default 0
);

alter table meetup_media enable row level security;

create policy "meetup media is publicly readable"
  on meetup_media for select
  using (true);

create policy "hosts manage their own meetup media"
  on meetup_media for all
  using (
    auth.uid() = (select host_id from meetups where meetups.id = meetup_media.meetup_id)
  )
  with check (
    auth.uid() = (select host_id from meetups where meetups.id = meetup_media.meetup_id)
  );

create index meetup_media_meetup_id_idx on meetup_media (meetup_id);
