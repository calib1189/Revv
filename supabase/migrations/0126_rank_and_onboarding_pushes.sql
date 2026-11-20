-- Three new pushes from the hourly job (0107), all in the afternoon and
-- all logged in daily_push_log like the Daily pushes, so the log's
-- primary key stops two overlapping runs sending the same one twice:
--
--   rank      "Your car got passed": once a day at most, for owners whose
--             car another owner's car moved ahead of on the leaderboard.
--             Nothing about rank is stored: the job rebuilds yesterday's
--             board from build_rating_history (0070) and compares.
--   add_car   Once ever, a day after joining, for someone with no car.
--   rate_car  Once ever, for someone whose cars have never been rated.
--
-- Until this runs, the insert fails the kind check and none of the three
-- is ever sent; nothing else is affected.
alter table daily_push_log drop constraint if exists daily_push_log_kind_check;
alter table daily_push_log add constraint daily_push_log_kind_check
  check (kind in ('morning', 'evening', 'vote', 'rank', 'add_car', 'rate_car'));
