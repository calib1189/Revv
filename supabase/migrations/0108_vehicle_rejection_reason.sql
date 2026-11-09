-- New-car approvals: a message to the owner when a car is rejected, and
-- a way back into review.
--
-- ownership_rejection_reason is the admin's note, shown on the owner's
-- car page and sent in the rejection push. Only admins can set it.
--
-- A rejected car whose owner uploads a new cover photo goes back to
-- 'pending', so it shows up in the admin's New cars queue again without
-- the owner having to ask.

alter table vehicles
  add column ownership_rejection_reason text
    check (ownership_rejection_reason is null or char_length(ownership_rejection_reason) <= 500);

-- Replaces 0040's version. Same rule for the status (a non-admin may only
-- ever move it to 'pending'), plus the two additions above.
create or replace function public.protect_ownership_verification_column()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  if auth.role() = 'authenticated' and (
    new.ownership_verification_status is distinct from old.ownership_verification_status
    or new.ownership_rejection_reason is distinct from old.ownership_rejection_reason
    or (old.ownership_verification_status = 'rejected' and new.hero_media_id is distinct from old.hero_media_id)
  ) then
    select is_admin into caller_is_admin from profiles where id = auth.uid();
    if not coalesce(caller_is_admin, false) then
      if new.ownership_verification_status is distinct from old.ownership_verification_status
         and new.ownership_verification_status != 'pending' then
        new.ownership_verification_status := old.ownership_verification_status;
      end if;
      new.ownership_rejection_reason := old.ownership_rejection_reason;
      if old.ownership_verification_status = 'rejected'
         and new.hero_media_id is distinct from old.hero_media_id
         and new.hero_media_id is not null then
        new.ownership_verification_status := 'pending';
      end if;
    end if;
  end if;
  return new;
end;
$$;
