-- Caches Google Places (New) Text Search responses to cut real per-call
-- cost — shop listings (name, address, rating, hours) don't change
-- minute-to-minute, so repeat searches for the same category/query in
-- roughly the same area within the cache window reuse the last real
-- response instead of paying Google for another one. Shared across every
-- caller on purpose (not user-keyed): this is public business data
-- pulled from Google, nothing sensitive to isolate per user, and the
-- whole point is for different people searching the same area/category
-- to share one cached answer.

create table places_search_cache (
  cache_key text primary key,
  response jsonb not null,
  created_at timestamptz not null default now()
);

alter table places_search_cache enable row level security;

create policy "anyone can read cached places searches"
  on places_search_cache for select
  using (true);

-- Deliberately no insert/update policy for anon/authenticated — only the
-- service role (server-only, never exposed to a client) can write to
-- this cache. Without that, anyone could poison it with fake shop data
-- via a direct Supabase REST call using nothing but the public anon key,
-- which every future search for that key would then serve back as if it
-- were real Google Places data.

create index places_search_cache_created_at_idx on places_search_cache (created_at);
