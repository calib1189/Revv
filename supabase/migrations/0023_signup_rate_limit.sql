-- Signup-specific rate limiting, keyed by IP rather than user_id since
-- there's no authenticated user yet at signup time. Mirrors 0014's
-- SECURITY DEFINER pattern, but the check function is called from the
-- server action (before supabase.auth.signUp()) rather than from an RLS
-- policy, since auth.users isn't a table we can attach our own insert
-- policy to.

create table signup_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default now()
);

alter table signup_attempts enable row level security;

-- Anyone (including anon, pre-auth) can record an attempt — it's just a
-- timestamp + IP, no sensitive data, and the rate-limit function is what
-- actually gates anything meaningful. No select policy: nothing reads
-- this table directly from the client, only through the function below.
create policy "anyone can record a signup attempt"
  on signup_attempts for insert
  with check (true);

create index signup_attempts_ip_created_at_idx on signup_attempts (ip, created_at);

create or replace function public.under_signup_rate_limit(p_ip text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select count(*) < 5
  from signup_attempts
  where ip = p_ip
    and created_at > now() - interval '1 hour';
$$;

revoke all on function public.under_signup_rate_limit(text) from public;
grant execute on function public.under_signup_rate_limit(text) to anon, authenticated;
