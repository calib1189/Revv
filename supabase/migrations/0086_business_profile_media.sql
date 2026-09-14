-- The scrollable photo gallery on a claimed business's listing — same
-- join-table shape as meetup_media (0018_meetup_media.sql).
create table business_profile_media (
  id uuid primary key default gen_random_uuid(),
  business_profile_id uuid not null references business_profiles (id) on delete cascade,
  media_id uuid not null references media (id) on delete cascade,
  position int not null default 0
);

alter table business_profile_media enable row level security;

create policy "business profile media is visible wherever the profile itself is"
  on business_profile_media for select
  using (
    exists (
      select 1 from business_profiles
      where business_profiles.id = business_profile_media.business_profile_id
        and (business_profiles.verification_status = 'approved' or business_profiles.owner_id = auth.uid())
    )
  );

create policy "owners manage their own business profile media"
  on business_profile_media for all
  using (
    auth.uid() = (select owner_id from business_profiles where business_profiles.id = business_profile_media.business_profile_id)
  )
  with check (
    auth.uid() = (select owner_id from business_profiles where business_profiles.id = business_profile_media.business_profile_id)
  );

create index business_profile_media_business_profile_id_idx on business_profile_media (business_profile_id);
