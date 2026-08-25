-- identifyVehicleAction (the "identify with a photo" vision call) had no
-- auth check and no rate limit at all — unlike every other write path in
-- this app (posts/comments/messages/reports rate-limited at the RLS
-- layer in 0014, signup in 0023). It doesn't insert into any table
-- itself, so there's no RLS policy to hang a limit off of the way those
-- do; it needs its own record-and-check table, same shape as 0023's
-- signup_attempts. Real cost per call (a Gemini API request), and no
-- protection at all against a caller hitting this Server Action directly
-- and repeatedly, is exactly the "growing dollar cost, not just a
-- performance question" scaling gap.

create table ai_identify_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table ai_identify_attempts enable row level security;

-- Just a timestamp, no sensitive content — the rate-limit function below
-- is what actually gates anything. No select policy: nothing reads this
-- table directly from the client.
create policy "users record their own identify attempts"
  on ai_identify_attempts for insert
  with check (auth.uid() = user_id);

create index ai_identify_attempts_user_id_created_at_idx
  on ai_identify_attempts (user_id, created_at);

-- Generous for real use (someone genuinely trying a few photos while
-- adding a couple of cars) while still capping worst-case cost from a
-- single account hammering this action.
create or replace function public.under_ai_identify_rate_limit(p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select count(*) < 20
  from ai_identify_attempts
  where user_id = p_user_id
    and created_at > now() - interval '1 hour';
$$;

revoke all on function public.under_ai_identify_rate_limit(uuid) from public;
grant execute on function public.under_ai_identify_rate_limit(uuid) to authenticated;
