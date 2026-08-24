-- Splits the single AI rating summary into two parts so "rate my build"
-- can actually explain itself: what earned the score, and what's
-- specifically holding it back from a higher one. ai_rating_summary stays
-- in place (unused for new ratings, but keeps displaying correctly for
-- builds rated before this change).

alter table builds
  add column ai_rating_strengths text,
  add column ai_rating_limiting_factors text;
