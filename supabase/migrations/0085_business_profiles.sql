-- Lets a member claim a real-world shop (a Google Place, same place_id
-- shop_promotions already uses) as their own business and customize its
-- listing — a logo, a photo gallery, a short description — once an admin
-- verifies they actually run it. Shops have no local "shops" table (see
-- 0045_shop_promotions.sql's comment) — this overlays SORZA-native data
-- onto an external place_id the same way shop_promotions already does,
-- storing a place_name/place_address snapshot for the same reason: admins
-- reviewing a claim need something to show without re-querying Google.
create table business_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  place_id text not null,
  place_name text not null,
  place_address text,
  description text check (description is null or char_length(description) <= 500),
  logo_media_id uuid references media (id) on delete set null,
  verification_status text not null default 'none'
    check (verification_status in ('none', 'pending', 'approved', 'rejected')),
  verification_media_id uuid references media (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table business_profiles enable row level security;

create policy "approved business profiles are publicly readable"
  on business_profiles for select
  using (verification_status = 'approved');

create policy "owners see their own business profile regardless of status"
  on business_profiles for select
  using (auth.uid() = owner_id);

create policy "admins see every business profile"
  on business_profiles for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- A fresh claim always starts at 'none' — submitting for verification is a
-- separate update afterward (mirrors ownership-verification's two-step
-- shape), so the same protect trigger below covers every path to 'pending'.
create policy "owners create their own business profile"
  on business_profiles for insert
  with check (auth.uid() = owner_id and verification_status = 'none');

create policy "owners update their own business profile"
  on business_profiles for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "admins update any business profile"
  on business_profiles for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "owners delete their own business profile"
  on business_profiles for delete
  using (auth.uid() = owner_id);

-- Same relaxed self-service pattern as ownership_verification_status
-- (0040_ownership_verification.sql): a non-admin can move their own row
-- to 'pending' and nothing else — any other attempted transition
-- (including straight to 'approved') is silently reverted rather than
-- rejected, so the rest of that update (a logo change, say) still lands.
create or replace function public.protect_business_verification_column()
returns trigger language plpgsql security definer set search_path = public as $$
declare caller_is_admin boolean;
begin
  if auth.role() = 'authenticated'
     and new.verification_status is distinct from old.verification_status then
    select is_admin into caller_is_admin from profiles where id = auth.uid();
    if not coalesce(caller_is_admin, false) and new.verification_status != 'pending' then
      new.verification_status := old.verification_status;
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_business_verification_column
  before update on business_profiles for each row execute function public.protect_business_verification_column();

-- Only one non-rejected claim can exist per place at a time — a rejected
-- claim (an impostor, say) doesn't permanently block the real owner from
-- claiming it afterward, since rejected rows fall outside this index.
create unique index business_profiles_place_id_active_idx
  on business_profiles (place_id)
  where verification_status in ('none', 'pending', 'approved');

create index business_profiles_owner_id_idx on business_profiles (owner_id);
