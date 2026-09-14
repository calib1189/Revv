-- A shared sound library, TikTok-style: one sound can be attached to many
-- posts by many different users, so it lives as its own table rather than
-- routing through `media` (which is a one-owner-per-row asset a single post
-- owns and can cascade-delete freely — a sound needs to survive independently
-- of any one post or, for a curated/system sound, any one user at all).
--
-- owner_id is nullable and ON DELETE SET NULL (not CASCADE, unlike media's
-- owner_id): a curated/seed sound has no user owner at all, and a sound a
-- real user uploaded should keep working for everyone still using it even if
-- that user later deletes their account — only their OWN posts disappear on
-- account deletion, not a shared sound other people's posts still reference.
create table sounds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles (id) on delete set null,
  title text not null check (char_length(title) between 1 and 80),
  artist_name text check (artist_name is null or char_length(artist_name) <= 80),
  storage_path text not null,
  duration_ms int not null,
  -- 'original' = SORZA-provided starter catalog, 'licensed' = admin-added
  -- from a verified royalty-free source, 'user_upload' = any member's own
  -- upload. Purely informational (shown on the sound's page) — RLS doesn't
  -- branch on this column.
  source text not null default 'user_upload' check (source in ('original', 'licensed', 'user_upload')),
  license_label text,
  license_url text,
  created_at timestamptz not null default now()
);

alter table sounds enable row level security;

create policy "sounds are publicly readable"
  on sounds for select
  using (true);

create policy "owners manage their own sounds"
  on sounds for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Moderation escape hatch, same idiom as every other admin-override policy
-- in this codebase (e.g. 0009_analytics.sql) — sounds are user-generated
-- audio, so admins need a way to remove one without needing to be its owner.
create policy "admins delete any sound"
  on sounds for delete
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create index sounds_owner_id_idx on sounds (owner_id) where owner_id is not null;
