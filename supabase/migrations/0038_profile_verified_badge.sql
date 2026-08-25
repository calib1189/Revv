-- Verified badge — a cosmetic, account-level marker shown next to a
-- profile's name (distinct from parts.verified, which is about product
-- data accuracy, not accounts). No self-service way to become verified,
-- same as is_admin (0008): promote manually via
--   update profiles set is_verified = true where username = 'your_username';

alter table profiles add column is_verified boolean not null default false;

-- Same lesson as 0012_protect_is_admin_column: the "users update their
-- own profile" policy from 0001 only restricts WHICH row a user can
-- update, not which columns — without this trigger, any authenticated
-- user could self-verify with a direct PATCH to their own profile row.
-- Mirrors protect_is_admin_column exactly: authenticated (PostgREST)
-- requests can't touch this column; direct SQL and service-role
-- requests can.
create or replace function public.protect_is_verified_column()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and new.is_verified is distinct from old.is_verified then
    new.is_verified := old.is_verified;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_is_verified_column on profiles;
create trigger protect_is_verified_column
  before update on profiles
  for each row execute function public.protect_is_verified_column();

update profiles set is_verified = true where username = 'calib_lawson';
