-- Sorza Daily: how many points the winner gets, set per day. Run after 0127.
--
-- Null is an ordinary day: first place pays the usual amount
-- (DAILY_POINTS.place[1] in src/lib/points/values.ts). An admin can raise
-- it for a special day, e.g. 250. Second and third are unchanged.
--
-- No new policies: a column on daily_challenges, which only admins can
-- write (0103) and everyone can read once the day starts.

alter table daily_challenges
  add column winner_points integer check (winner_points is null or winner_points between 1 and 10000);
