-- Who's going to a meet, and which car they're bringing. One row per
-- person per meet (the primary key), so tapping "Going" twice can't
-- double-count anyone. vehicle_id is optional: someone with no car in
-- their garage, or who hasn't decided, can still say they're going.
--
-- The meet's overall rating (the average of the attending cars' scores)
-- is computed when the page is read, never stored here or on meetups.

create table meetup_attendees (
  meetup_id uuid not null references meetups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  vehicle_id uuid references vehicles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);

alter table meetup_attendees enable row level security;

-- Readable exactly when the meet itself is readable: the subquery runs
-- under meetups' own RLS, so attendees of a meet that's still pending
-- payment or review stay as hidden as the meet.
create policy "attendees are readable with their meet"
  on meetup_attendees for select
  using (exists (select 1 from meetups m where m.id = meetup_id));

-- You can only add yourself, only to a live meet that hasn't finished
-- (the same 3-hour grace window the Meets list uses), and only with a
-- car from your own garage.
create policy "users mark themselves as going"
  on meetup_attendees for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from meetups m
      where m.id = meetup_id
        and m.status = 'active'
        and m.starts_at > now() - interval '3 hours'
    )
    and (
      vehicle_id is null
      or exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid())
    )
  );

create policy "users change the car they're bringing"
  on meetup_attendees for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      vehicle_id is null
      or exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid())
    )
  );

create policy "users take back their own rsvp"
  on meetup_attendees for delete
  using (auth.uid() = user_id);

create index meetup_attendees_user_id_idx on meetup_attendees (user_id);
