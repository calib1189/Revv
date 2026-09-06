-- Points move from "auto-awarded the instant an achievement unlocks or
-- a challenge completes" to "claimed explicitly" — a real reward
-- should feel collected, not just quietly appear in a ledger. Null
-- means unlocked/completed but not yet claimed; the row itself
-- (already inserted at unlock/completion time) is what "eligible to
-- claim" means, same as before.
alter table user_achievements add column claimed_at timestamptz;
alter table user_challenge_completions add column claimed_at timestamptz;
