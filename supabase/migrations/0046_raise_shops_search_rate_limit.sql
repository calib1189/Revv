-- 15/hour turned out too tight for real use, not just abuse: browsing
-- all 8 shop categories once already burns more than half of it, and the
-- "Promote your shop" lookup (searchShopsByQueryAction) draws from the
-- same bucket — a single engaged session could hit the ceiling doing
-- nothing wrong. Raised to 40/hour, which is still real cost protection
-- (this is per-IP, not a global budget, and Places API Text Search Pro
-- is cheap enough per call that 40/hour from one visitor is negligible)
-- while giving normal browsing real headroom.

create or replace function public.under_shops_search_rate_limit(p_ip text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select count(*) < 40
  from shops_search_attempts
  where ip = p_ip
    and created_at > now() - interval '1 hour';
$$;
