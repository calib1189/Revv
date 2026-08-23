-- Critical fix: profiles.is_admin was added in 0008, but the pre-existing
-- "users update their own profile" policy from 0001 only restricts WHICH
-- ROW a user can update (auth.uid() = id) — it has no column-level check.
-- RLS does not restrict columns by itself. That means any authenticated
-- user could PATCH their own profile row with {"is_admin": true} and it
-- passes RLS cleanly, self-granting admin (full moderation powers, access
-- to /admin/reports, /admin/audit-log, /admin/analytics, and the ability
-- to delete any post/comment).
--
-- Fix: a BEFORE UPDATE trigger that silently discards any change to
-- is_admin when the request comes through as Supabase's "authenticated"
-- role (i.e. any normal logged-in client request via PostgREST). Direct
-- SQL (the documented admin-promotion workflow: "update profiles set
-- is_admin = true where username = ...") runs as the postgres role, which
-- has no auth.role() claim, so it's untouched. Service-role requests
-- (auth.role() = 'service_role') are untouched too.

create or replace function public.protect_is_admin_column()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and new.is_admin is distinct from old.is_admin then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_is_admin_column on profiles;
create trigger protect_is_admin_column
  before update on profiles
  for each row execute function public.protect_is_admin_column();
