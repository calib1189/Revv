-- Which kinds of push notification each person wants, set from
-- Settings → Notifications. Only push is filtered: the Activity page
-- (the notifications table, written by triggers) still records
-- everything, the way muting a category on a phone still leaves it in
-- the app.
--
-- One row per person, created the first time they change anything. No
-- row means every category is on, which is what sendPushToUser assumes
-- when it finds none — nobody has to opt back in to the defaults.
create table notification_preferences (
  user_id uuid primary key references profiles (id) on delete cascade,
  likes boolean not null default true,
  comments boolean not null default true,
  follows boolean not null default true,
  messages boolean not null default true,
  crews boolean not null default true,
  -- Decisions about your own things: a meet or ad approved, a vehicle
  -- verified.
  updates boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table notification_preferences enable row level security;

create policy "people read their own notification preferences"
  on notification_preferences for select
  using (auth.uid() = user_id);

create policy "people create their own notification preferences"
  on notification_preferences for insert
  with check (auth.uid() = user_id);

create policy "people change their own notification preferences"
  on notification_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
