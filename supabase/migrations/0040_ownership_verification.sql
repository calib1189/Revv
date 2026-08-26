-- Leaderboard eligibility gate: a build only counts for the leaderboard
-- once its vehicle's ownership has been verified — a photo of the whole
-- car with a handwritten sign showing the owner's username, reviewed by
-- an admin. Makes lifting a photo off Google/a forum insufficient on its
-- own: you'd need the actual physical car in front of you to stage the
-- required photo. Deliberately per-vehicle, not per-post or per-build —
-- once a specific car+owner is verified, it stays verified as the build
-- evolves, rather than re-verifying on every mod update.
alter table vehicles
  add column ownership_verification_status text not null default 'none'
    check (ownership_verification_status in ('none', 'pending', 'approved', 'rejected'));
alter table vehicles
  add column ownership_verification_media_id uuid references media (id) on delete set null;

-- Same lesson as 0012_protect_is_admin_column and 0038's
-- protect_is_verified_column: RLS's "owners manage their own vehicles"
-- (0001) restricts which row, not which columns or which VALUES — a
-- naive column-protection trigger blocking all authenticated writes
-- (like the is_admin one does) would also block the admin review flow
-- itself, since admins authenticate as the same 'authenticated' role,
-- there's no separate DB role for them. So instead: a non-admin owner
-- may only move this column to 'pending' (submitting or resubmitting
-- their verification photo) — never directly to 'approved' or
-- 'rejected', which is the actual thing this exists to prevent.
-- Admins (is_admin = true) may set any value, which is what lets the
-- approve/reject actions in the admin review queue work at all.
create or replace function public.protect_ownership_verification_column()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  if auth.role() = 'authenticated'
     and new.ownership_verification_status is distinct from old.ownership_verification_status then
    select is_admin into caller_is_admin from profiles where id = auth.uid();
    if not coalesce(caller_is_admin, false) and new.ownership_verification_status != 'pending' then
      new.ownership_verification_status := old.ownership_verification_status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_ownership_verification_column on vehicles;
create trigger protect_ownership_verification_column
  before update on vehicles
  for each row execute function public.protect_ownership_verification_column();

-- Admins need to be able to update vehicles they don't own at all (to
-- approve/reject), which "owners manage their own vehicles" doesn't
-- grant — same admins-get-an-additional-policy pattern as 0008_admin.sql.
create policy "admins update any vehicle"
  on vehicles for update
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
