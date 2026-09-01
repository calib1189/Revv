-- Founder badge — a cosmetic, account-level marker shown on the profile
-- of REVV's own founder. Distinct from is_verified (0038), which is a
-- general "we confirmed this account" signal any user can be granted;
-- this one is specific to a single account. Same protection pattern as
-- is_verified/is_admin: no self-service way to grant it, promote
-- manually via
--   update profiles set is_founder = true where username = 'your_username';

alter table profiles add column is_founder boolean not null default false;

-- Same lesson as protect_is_verified_column (0038): without this
-- trigger, any authenticated user could self-grant the badge with a
-- direct PATCH to their own profile row.
create or replace function public.protect_is_founder_column()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and new.is_founder is distinct from old.is_founder then
    new.is_founder := old.is_founder;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_is_founder_column on profiles;
create trigger protect_is_founder_column
  before update on profiles
  for each row execute function public.protect_is_founder_column();

update profiles set is_founder = true where username = 'calib_lawson';
