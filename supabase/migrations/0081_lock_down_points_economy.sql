-- Security fix: points_ledger, user_achievements, user_challenge_completions,
-- and store_items_owned each had a "users insert their own row" policy whose
-- only check was `auth.uid() = user_id` — no validation that the achievement
-- was actually unlocked, the challenge actually completed, or the purchase
-- actually priced correctly. Every one of these tables is reachable directly
-- through the Supabase REST/JS API with nothing but a normal user's own
-- session token (the anon key + JWT are client-exposed by design), so any
-- authenticated user could grant themselves arbitrary points, fabricate an
-- achievement/challenge unlock, or hand themselves a store item for free —
-- completely bypassing claimAchievementPointsAction, claimChallengePointsAction,
-- and purchaseItemAction, whose server-side checks never run if the client
-- writes the table directly instead of calling the action.
--
-- The fix: drop the client-facing insert policies. Reads stay exactly as
-- they were (a user's own balance/history, and the public achievement/
-- challenge trophy case). The only way to write these four tables from now
-- on is the service-role client, which bypasses RLS entirely — so every
-- write must go through server code that has already independently computed
-- (from the user's own real data) that the reward is legitimate. This is the
-- exact same trust boundary the app already relied on; it just used to be
-- enforced by "well-behaved clients only call the Server Action," which is
-- not enforcement at all. See src/lib/db/points.ts, user-achievements.ts,
-- user-challenge-completions.ts and their callers for the privileged-write
-- side of this fix.
--
-- This also incidentally fixes the claimed_at columns on user_achievements
-- and user_challenge_completions never being updatable at all (no update
-- policy was ever added for either table) — the service-role client bypasses
-- RLS for updates too, so claiming now actually persists.
drop policy if exists "users insert their own points ledger rows" on points_ledger;
drop policy if exists "users unlock their own achievements" on user_achievements;
drop policy if exists "users record their own challenge completions" on user_challenge_completions;
drop policy if exists "users insert their own owned items" on store_items_owned;
