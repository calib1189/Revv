-- Restores decimal precision on the 0-100 rating scale (e.g. 95.25
-- instead of 95) — 0027 moved it to a whole-number integer, this widens
-- it back out to two decimal places without resetting any scores in
-- between (an integer 67 becomes 67.00, not reset to null/0).

alter table builds drop constraint if exists builds_ai_rating_score_check;

alter table builds
  alter column ai_rating_score type numeric(5,2) using ai_rating_score::numeric(5,2),
  add constraint builds_ai_rating_score_check
    check (ai_rating_score is null or (ai_rating_score >= 0 and ai_rating_score <= 100));
