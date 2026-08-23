-- AI build rating ("rate my build out of 10") with a rank-tier flex
-- display. Lives on `builds` (a rating judges the modifications, which
-- belong to the build per the build-owns-the-parts invariant), read
-- publicly since the whole point is other people seeing it. Written only
-- through the confirm action after the owner reviews the AI's proposed
-- score — never auto-written straight from the AI call.

alter table builds
  add column ai_rating_score numeric(3,1)
    check (ai_rating_score is null or (ai_rating_score >= 0 and ai_rating_score <= 10)),
  add column ai_rating_summary text,
  add column ai_rating_rated_at timestamptz;
