-- Rescales the AI build rating from 0-10 (one decimal) to 0-100 (whole
-- number) — reads as a proper Metacritic-style score rather than a GPA,
-- and the tier system in src/lib/rating/rank.ts moves with it. Existing
-- scores are preserved on the new scale (6.7 -> 67), not reset.

alter table builds drop constraint if exists builds_ai_rating_score_check;

update builds
  set ai_rating_score = round(ai_rating_score * 10)
  where ai_rating_score is not null;

alter table builds
  alter column ai_rating_score type integer using round(ai_rating_score)::integer,
  add constraint builds_ai_rating_score_check
    check (ai_rating_score is null or (ai_rating_score >= 0 and ai_rating_score <= 100));
