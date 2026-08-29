-- Extends shop promotion events with the extra metrics Revv Business
-- Analytics needs beyond impressions/clicks: a visit to the shop's own
-- REVV detail page, a tap on "Get a quote" (a lightweight inquiry —
-- no message is actually sent anywhere, it's just a counted signal of
-- interest), and a tap on the shop's website link.

alter table shop_promotion_events drop constraint shop_promotion_events_kind_check;
alter table shop_promotion_events add constraint shop_promotion_events_kind_check
  check (kind in ('impression', 'click', 'profile_visit', 'inquiry', 'website_click'));

-- All-time counts for a place, not scoped to one promotion's paid date
-- window like get_shop_promotion_event_counts is — a business dashboard
-- is "how is my listing doing overall", not "how did this one purchase
-- perform". Gated on ever having an ACTIVE (paid, not just started-
-- checkout) promotion for this place, since that's the only proof of
-- any connection to a shop this app has — shops come from Google, not a
-- REVV account, so there's no real ownership model beyond "you paid to
-- promote this listing at least once".
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
    and exists (
      select 1 from shop_promotions p
      where p.place_id = p_place_id
        and p.promoter_id = auth.uid()
        and p.status = 'active'
    );
$$;

revoke all on function public.get_shop_analytics_counts(text) from public;
grant execute on function public.get_shop_analytics_counts(text) to authenticated;

-- Lets a signed-in visitor (and the shop detail page's server render)
-- tell whether the current user has ever promoted this place at all —
-- used to decide whether to show a "View analytics" link, without
-- needing to know a specific promotion id up front the way
-- get_shop_promotion_event_counts does.
create or replace function public.has_promoted_shop(p_place_id text)
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
  );
$$;

revoke all on function public.has_promoted_shop(text) from public;
grant execute on function public.has_promoted_shop(text) to authenticated;
