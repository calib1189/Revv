-- confirmBuildRatingAction took score/strengths/limitingFactors/subscores
-- as plain arguments from the client and only range-checked them — it
-- never verified they matched a rating the server actually generated.
-- Since Server Actions are real callable network endpoints, anyone could
-- call it directly with score: 100 and invented text and it would just
-- save. Worse, "owners manage builds on their own vehicles" (0001_init.sql)
-- and build_rating_history's own insert policy (0070) grant owners full
-- write access at the RLS layer too, so even fixing the Server Action
-- alone wouldn't close it — a raw Supabase client call gets there just as
-- easily. Same vulnerability class as profiles.is_admin (0012) and
-- vehicles.ownership_verification_status (0040), just never closed here.
--
-- Fix: the AI's actual output now lands in a set of *pending* columns,
-- written only by the server (service-role client, in
-- generateBuildRatingAction) right after a real provider.rateBuild() call
-- returns. Confirming a rating no longer takes rating content from the
-- client at all — confirmBuildRatingAction takes just a vehicleId, reads
-- the pending columns itself, and promotes them. The trigger below is
-- the actual boundary: it blocks any authenticated-role write to either
-- the pending or the confirmed ai_rating_* columns, so this holds even if
-- application code regresses later — only the service role (which
-- bypasses RLS and triggers checking auth.role() = 'authenticated'
-- entirely) can ever set these.
alter table builds
  add column ai_rating_pending_score numeric(5,2)
    check (ai_rating_pending_score is null or (ai_rating_pending_score >= 0 and ai_rating_pending_score <= 100)),
  add column ai_rating_pending_strengths text,
  add column ai_rating_pending_limiting_factors text,
  add column ai_rating_pending_subscores jsonb,
  add column ai_rating_pending_is_mock boolean;

create or replace function public.protect_ai_rating_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'authenticated' then
    new.ai_rating_score := old.ai_rating_score;
    new.ai_rating_strengths := old.ai_rating_strengths;
    new.ai_rating_limiting_factors := old.ai_rating_limiting_factors;
    new.ai_rating_subscores := old.ai_rating_subscores;
    new.ai_rating_rated_at := old.ai_rating_rated_at;
    new.ai_rating_pending_score := old.ai_rating_pending_score;
    new.ai_rating_pending_strengths := old.ai_rating_pending_strengths;
    new.ai_rating_pending_limiting_factors := old.ai_rating_pending_limiting_factors;
    new.ai_rating_pending_subscores := old.ai_rating_pending_subscores;
    new.ai_rating_pending_is_mock := old.ai_rating_pending_is_mock;
  end if;
  return new;
end;
$$;

create trigger protect_ai_rating_columns
  before update on builds for each row execute function public.protect_ai_rating_columns();

-- Ownership is checked in application code now (confirmBuildRatingAction's
-- requireOwner), by a service-role client that bypasses RLS entirely —
-- an authenticated-role insert policy here would just be the same
-- unverified-content hole in a different table, so there isn't one
-- anymore.
drop policy if exists "owners insert their own build's rating history" on build_rating_history;
