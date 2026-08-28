-- Impression/click tracking for promoted shops, so a promoter can see
-- whether their Silver/Gold/Diamond spend is actually working — same
-- append-only event-log shape as ad_events, but keyed by place_id (a
-- Google Places id, not a REVV row) since the same place could have more
-- than one promotion row over time (renewals) and events should still
-- roll up across them for whichever promotion is currently active.
--
-- Unlike post_views/meetup_views, this is NOT publicly readable — it's
-- private performance data for whoever paid for the promotion, not
-- something anyone should be able to scrape for a competitor's shop.
-- Reading it goes through get_shop_promotion_event_counts below instead
-- of a select policy, which checks promoter_id and the promotion's own
-- paid date window before returning anything.

create table shop_promotion_events (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  kind text not null check (kind in ('impression', 'click')),
  viewer_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table shop_promotion_events enable row level security;

create policy "users record their own shop promotion events"
  on shop_promotion_events for insert
  with check (auth.uid() = viewer_id);

create index shop_promotion_events_place_id_created_at_idx
  on shop_promotion_events (place_id, created_at);

create or replace function public.get_shop_promotion_event_counts(p_promotion_id uuid)
returns table (impressions bigint, clicks bigint)
language sql
security definer set search_path = public
stable
as $$
  select
    count(*) filter (where e.kind = 'impression') as impressions,
    count(*) filter (where e.kind = 'click') as clicks
  from shop_promotions p
  join shop_promotion_events e
    on e.place_id = p.place_id
    and e.created_at >= p.starts_at
    and e.created_at <= p.ends_at
  where p.id = p_promotion_id
    and p.promoter_id = auth.uid();
$$;

revoke all on function public.get_shop_promotion_event_counts(uuid) from public;
grant execute on function public.get_shop_promotion_event_counts(uuid) to authenticated;
