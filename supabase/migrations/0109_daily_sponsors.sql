-- Sorza Daily, part 6: sponsored challenges and prizes. Run after 0108.
--
-- An admin can put a sponsor on any scheduled day: a name, a link, a logo
-- and the prize the winner gets. A prize can also stand on its own, for a
-- day SORZA runs itself with something real to win. Every column is
-- optional; a day without them (including every weekday-rotation day)
-- shows exactly as before.
--
-- No new policies: these are columns on daily_challenges, which only
-- admins can write (0103) and everyone can read once the day starts.

alter table daily_challenges
  add column sponsor_name text check (sponsor_name is null or char_length(sponsor_name) between 1 and 60),
  add column sponsor_url text check (
    sponsor_url is null or (sponsor_url ~ '^https://' and char_length(sponsor_url) <= 300)
  ),
  add column sponsor_logo_media_id uuid references media (id) on delete set null,
  add column prize text check (prize is null or char_length(prize) between 1 and 120),
  -- A link or logo with no name to go with it would show as nothing.
  add constraint daily_sponsor_named check (
    sponsor_name is not null or (sponsor_url is null and sponsor_logo_media_id is null)
  );
