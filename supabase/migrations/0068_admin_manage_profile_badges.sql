-- REVV-controlled role badges, part 1: give admins an actual control
-- surface for is_verified/is_founder instead of "run raw SQL against the
-- database" (the only way either has ever been grantable). Neither
-- column becomes self-service — they stay admin-only — this only adds a
-- real admin UI on top of the same protection.
--
-- Doing this surfaced a real, separate bug: there has never been an RLS
-- policy letting an admin UPDATE a profile row that isn't their own.
-- "users update their own profile" (0001) is `using (auth.uid() = id)`
-- only — so setUserBanned/unbanUserAction (0055/features/admin/actions.ts)
-- calling `.update(...).eq("id", targetUserId)` as the acting admin has
-- been silently matching zero rows this whole time (RLS filters, not an
-- error, so `if (error) throw` never caught it). Fixed here as the same
-- admins-get-an-additional-policy pattern as 0040_ownership_verification.

create policy "admins update any profile"
  on profiles for update
  using (
    exists (select 1 from profiles as acting where acting.id = auth.uid() and acting.is_admin = true)
  )
  with check (
    exists (select 1 from profiles as acting where acting.id = auth.uid() and acting.is_admin = true)
  );

-- Carve out the same admin exception protect_ownership_verification_column
-- (0040) uses for vehicles, applied to is_verified/is_founder. is_admin
-- itself (0012) is deliberately left untouched — that one stays SQL-only,
-- so no admin can grant admin access to anyone (including themselves)
-- through the app.
create or replace function public.protect_is_verified_column()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  if auth.role() = 'authenticated' and new.is_verified is distinct from old.is_verified then
    select is_admin into caller_is_admin from profiles where id = auth.uid();
    if not coalesce(caller_is_admin, false) then
      new.is_verified := old.is_verified;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.protect_is_founder_column()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  if auth.role() = 'authenticated' and new.is_founder is distinct from old.is_founder then
    select is_admin into caller_is_admin from profiles where id = auth.uid();
    if not coalesce(caller_is_admin, false) then
      new.is_founder := old.is_founder;
    end if;
  end if;
  return new;
end;
$$;
