-- Rate limit for the Amazon PA-API product search behind marketplace
-- category browsing. IP-keyed like signup_attempts (0023) rather than
-- user_id-keyed like the AI provider limits (0031-0033) — /parts is a
-- public page, so most callers here won't be logged in at all. The real
-- thing this protects isn't per-call cost (PA-API is free to call, just
-- rate-limited) but the shared Associates account's own request-rate
-- allowance, which real-account throttling from unbounded scraping
-- through our own endpoint could burn through for every visitor at once.

create table marketplace_search_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default now()
);

alter table marketplace_search_attempts enable row level security;

create policy "anyone can record a marketplace search attempt"
  on marketplace_search_attempts for insert
  with check (true);

create index marketplace_search_attempts_ip_created_at_idx
  on marketplace_search_attempts (ip, created_at);

create or replace function public.under_marketplace_search_rate_limit(p_ip text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select count(*) < 30
  from marketplace_search_attempts
  where ip = p_ip
    and created_at > now() - interval '1 hour';
$$;

revoke all on function public.under_marketplace_search_rate_limit(text) from public;
grant execute on function public.under_marketplace_search_rate_limit(text) to anon, authenticated;
