-- Everything a shop owner fills in on their claimed listing beyond the
-- logo, photos and description (0085/0086): a wide cover photo, a short
-- tagline, the services they offer, their weekly hours, and contact
-- details that override Google's when set. All optional; a listing with
-- none of them still shows exactly what it showed before.
--
-- Also lets a verified owner see their own listing's analytics. Until
-- now only someone who had paid to promote a shop could (0056).

alter table business_profiles
  add column cover_media_id uuid references media (id) on delete set null,
  add column tagline text check (tagline is null or char_length(tagline) <= 80),
  add column services text[] not null default '{}' check (cardinality(services) <= 12),
  -- { "mon": {"open":"08:00","close":"17:30"} | null, ... "sun": ... }
  -- null for a day means closed that day; a null column means the owner
  -- hasn't set hours. Shape is checked in the app (lib/shops/hours.ts).
  add column hours jsonb check (hours is null or jsonb_typeof(hours) = 'object'),
  add column phone text check (phone is null or char_length(phone) <= 30),
  add column website_url text check (
    website_url is null or (char_length(website_url) <= 200 and website_url ~* '^https?://')
  ),
  add column instagram text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$');

-- Promoter (as before) or the shop's verified owner.
create or replace function public.can_view_shop_analytics(p_place_id text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from shop_promotions
    where place_id = p_place_id
      and promoter_id = auth.uid()
      and status = 'active'
  ) or exists (
    select 1 from business_profiles
    where place_id = p_place_id
      and owner_id = auth.uid()
      and verification_status = 'approved'
  );
$$;

revoke all on function public.can_view_shop_analytics(text) from public;
grant execute on function public.can_view_shop_analytics(text) to authenticated;

create or replace function public.get_shop_analytics_counts(p_place_id text)
returns table (
  impressions bigint,
  profile_visits bigint,
  clicks bigint,
  inquiries bigint,
  website_clicks bigint
)
language sql
security definer set search_path = public
stable
as $$
  select
    count(*) filter (where e.kind = 'impression') as impressions,
    count(*) filter (where e.kind = 'profile_visit') as profile_visits,
    count(*) filter (where e.kind = 'click') as clicks,
    count(*) filter (where e.kind = 'inquiry') as inquiries,
    count(*) filter (where e.kind = 'website_click') as website_clicks
  from shop_promotion_events e
  where e.place_id = p_place_id
    and public.can_view_shop_analytics(p_place_id);
$$;
