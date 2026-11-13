-- Stories: a photo or video that stays up for 24 hours. The media itself
-- is an ordinary media row (uploaded like a post's); a story just points
-- at it with an expiry. Expired stories stay in the table (the author
-- may want them back later) but nobody else can read them.
--
-- Who has seen what is one story_views row per (story, viewer), so the
-- "seen" ring state and the author's viewer list are both computed from
-- real rows, never a counter.

create table stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  media_id uuid not null references media (id) on delete cascade,
  caption text check (caption is null or char_length(caption) <= 200),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create index stories_author_idx on stories (author_id, created_at desc);
create index stories_expires_idx on stories (expires_at);

alter table stories enable row level security;

-- Anyone can watch a story while it's up; the author can always read
-- their own, expired or not.
create policy "live stories are readable"
  on stories for select
  using (expires_at > now() or auth.uid() = author_id);

-- You post stories as yourself, only with media you uploaded, and not
-- while banned (same rule as posts, 0055).
create policy "users post their own stories"
  on stories for insert
  with check (
    auth.uid() = author_id
    and exists (select 1 from media m where m.id = media_id and m.owner_id = auth.uid())
    and not exists (select 1 from profiles where id = auth.uid() and is_banned)
  );

create policy "users delete their own stories"
  on stories for delete
  using (auth.uid() = author_id);

create table story_views (
  story_id uuid not null references stories (id) on delete cascade,
  viewer_id uuid not null references profiles (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create index story_views_viewer_idx on story_views (viewer_id);

alter table story_views enable row level security;

-- A viewer records their own view, once per story.
create policy "users record their own story views"
  on story_views for insert
  with check (auth.uid() = viewer_id);

-- A viewer sees their own views (for the seen ring); a story's author
-- sees who watched it.
create policy "viewers and story authors read story views"
  on story_views for select
  using (
    auth.uid() = viewer_id
    or exists (select 1 from stories s where s.id = story_id and s.author_id = auth.uid())
  );
