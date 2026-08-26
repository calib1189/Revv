-- Rate limit for the Google Places (New) Text Search behind "Shops near
-- you" on the Discover page. IP-keyed like marketplace_search_attempts
-- (0037) rather than user_id-keyed — the shops browser is public, so most
-- callers here won't be logged in at all.
--
-- Unlike the Amazon PA-API (free to call, just rate-limited for shared-
-- account throttling), Google Places Text Search bills per request. This
-- limit is the actual cost control, not just an abuse guard — kept
-- tighter than the marketplace one (30/hour) for that reason, since every
-- blocked call here is real money saved, not just request volume.

create table shops_search_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default now()
);

alter table shops_search_attempts enable row level security;

create policy "anyone can record a shops search attempt"
  on shops_search_attempts for insert
  with check (true);

create index shops_search_attempts_ip_created_at_idx
  on shops_search_attempts (ip, created_at);

create or replace function public.under_shops_search_rate_limit(p_ip text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select count(*) < 15
  from shops_search_attempts
  where ip = p_ip
    and created_at > now() - interval '1 hour';
$$;

revoke all on function public.under_shops_search_rate_limit(text) from public;
grant execute on function public.under_shops_search_rate_limit(text) to anon, authenticated;
