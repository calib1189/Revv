-- Sorza Daily, part 4: notification preferences, quiet hours and a send
-- log. Run after 0105.
--
-- Four new switches in Settings -> Notifications, all on by default like
-- every other category (no row still means everything on):
--   daily_challenge  the morning "challenge is live" and evening reminder
--   daily_results    the morning results for people who took part
--   daily_votes      someone voted for your entry
--   rate_ride        the evening Rate the Ride nudge
--
-- Quiet hours default on, 10pm to 8am in the person's own time zone. The
-- time zone is saved from their device; until then Central is assumed.
--
-- daily_push_log records every Daily push sent, keyed so the same push
-- can't go out twice: one morning and one evening push per person per
-- Sorza day, and numbered slots for vote alerts. Written only by the
-- server.

alter table notification_preferences
  add column daily_challenge boolean not null default true,
  add column daily_results boolean not null default true,
  add column daily_votes boolean not null default true,
  add column rate_ride boolean not null default true,
  add column quiet_hours boolean not null default true,
  add column quiet_start smallint not null default 22 check (quiet_start between 0 and 23),
  add column quiet_end smallint not null default 8 check (quiet_end between 0 and 23),
  add column time_zone text check (time_zone is null or char_length(time_zone) between 1 and 64);

create table daily_push_log (
  user_id uuid not null references profiles (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('morning', 'evening', 'vote')),
  slot smallint not null default 0 check (slot between 0 and 9),
  sent_at timestamptz not null default now(),
  primary key (user_id, day, kind, slot)
);

alter table daily_push_log enable row level security;
-- No policies: only the server reads or writes this.
