-- REVV V0: core schema + RLS for every table.
-- Aggregates (totals, counts, completion %) are never stored as columns —
-- compute them at read time from build_parts / likes / etc.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  bio text,
  avatar_media_id uuid,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,24}$')
);

alter table profiles enable row level security;

create policy "profiles are publicly readable"
  on profiles for select
  using (true);

create policy "users insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "users update their own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- auto-create a profile row whenever a new auth user is created, so
-- client code never has to win a race against RLS during signup.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'username',
      'user_' || substr(new.id::text, 1, 8)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- media
-- ---------------------------------------------------------------------
create table media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  storage_path text not null,
  kind text not null check (kind in ('image', 'video')),
  width int,
  height int,
  duration_ms int,
  created_at timestamptz not null default now()
);

alter table media enable row level security;

create policy "media is publicly readable"
  on media for select
  using (true);

create policy "owners manage their own media"
  on media for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- now that media exists, point profiles.avatar_media_id at it
alter table profiles
  add constraint profiles_avatar_media_id_fkey
  foreign key (avatar_media_id) references media (id) on delete set null;

-- ---------------------------------------------------------------------
-- vehicles
-- ---------------------------------------------------------------------
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  year int,
  make text,
  model text,
  trim text,
  engine text,
  drivetrain text,
  color text,
  mileage int,
  nickname text,
  description text,
  hero_media_id uuid references media (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table vehicles enable row level security;

create policy "vehicles are publicly readable"
  on vehicles for select
  using (true);

create policy "owners manage their own vehicles"
  on vehicles for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------------
-- builds
-- ---------------------------------------------------------------------
create table builds (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  status text not null default 'draft' check (status in ('active', 'draft', 'archived')),
  title text,
  budget_cents bigint check (budget_cents is null or budget_cents >= 0),
  copied_from_build_id uuid references builds (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table builds enable row level security;

create policy "active builds are publicly readable"
  on builds for select
  using (
    status = 'active'
    or exists (
      select 1 from vehicles
      where vehicles.id = builds.vehicle_id
        and vehicles.owner_id = auth.uid()
    )
  );

create policy "owners manage builds on their own vehicles"
  on builds for all
  using (
    exists (
      select 1 from vehicles
      where vehicles.id = builds.vehicle_id
        and vehicles.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from vehicles
      where vehicles.id = builds.vehicle_id
        and vehicles.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- parts (global catalog; writes are admin/service-role only for now)
-- ---------------------------------------------------------------------
create table parts (
  id uuid primary key default gen_random_uuid(),
  brand text,
  product text,
  category text,
  part_number text,
  specs jsonb not null default '{}'::jsonb,
  verified boolean not null default false,
  source text,
  created_at timestamptz not null default now()
);

alter table parts enable row level security;

create policy "parts catalog is publicly readable"
  on parts for select
  using (true);

-- no insert/update/delete policy: catalog writes go through the service
-- role (admin curation / matching job), not client-reachable code.

-- ---------------------------------------------------------------------
-- build_parts (the single record of "this car has this mod")
-- ---------------------------------------------------------------------
create table build_parts (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references builds (id) on delete cascade,
  part_id uuid references parts (id) on delete set null,
  raw_name text not null,
  category text,
  status text not null default 'planned' check (status in ('planned', 'ordered', 'installed')),
  price_cents bigint check (price_cents is null or price_cents >= 0),
  install_cost_cents bigint check (install_cost_cents is null or install_cost_cents >= 0),
  installed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table build_parts enable row level security;

create policy "build_parts follow their build's visibility"
  on build_parts for select
  using (
    exists (
      select 1 from builds
      join vehicles on vehicles.id = builds.vehicle_id
      where builds.id = build_parts.build_id
        and (builds.status = 'active' or vehicles.owner_id = auth.uid())
    )
  );

create policy "owners manage build_parts on their own builds"
  on build_parts for all
  using (
    exists (
      select 1 from builds
      join vehicles on vehicles.id = builds.vehicle_id
      where builds.id = build_parts.build_id
        and vehicles.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from builds
      join vehicles on vehicles.id = builds.vehicle_id
      where builds.id = build_parts.build_id
        and vehicles.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  vehicle_id uuid references vehicles (id) on delete set null,
  build_id uuid references builds (id) on delete set null,
  post_type text not null default 'photo' check (post_type in ('photo', 'video')),
  caption text,
  created_at timestamptz not null default now()
);

alter table posts enable row level security;

create policy "posts are publicly readable"
  on posts for select
  using (true);

create policy "authors manage their own posts"
  on posts for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- ---------------------------------------------------------------------
-- post_media
-- ---------------------------------------------------------------------
create table post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  media_id uuid not null references media (id) on delete cascade,
  position int not null default 0,
  unique (post_id, media_id)
);

alter table post_media enable row level security;

create policy "post_media is publicly readable"
  on post_media for select
  using (true);

create policy "post authors manage their post_media"
  on post_media for all
  using (
    exists (
      select 1 from posts
      where posts.id = post_media.post_id
        and posts.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from posts
      where posts.id = post_media.post_id
        and posts.author_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- post_hotspots (must point at a build_part — never free text)
-- ---------------------------------------------------------------------
create table post_hotspots (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  media_id uuid not null references media (id) on delete cascade,
  x numeric not null check (x >= 0 and x <= 1),
  y numeric not null check (y >= 0 and y <= 1),
  t_ms int,
  build_part_id uuid not null references build_parts (id) on delete cascade
);

alter table post_hotspots enable row level security;

create policy "post_hotspots are publicly readable"
  on post_hotspots for select
  using (true);

create policy "post authors manage their post_hotspots"
  on post_hotspots for all
  using (
    exists (
      select 1 from posts
      where posts.id = post_hotspots.post_id
        and posts.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from posts
      where posts.id = post_hotspots.post_id
        and posts.author_id = auth.uid()
    )
    and exists (
      select 1 from build_parts
      join builds on builds.id = build_parts.build_id
      join vehicles on vehicles.id = builds.vehicle_id
      where build_parts.id = post_hotspots.build_part_id
        and vehicles.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- likes
-- ---------------------------------------------------------------------
create table likes (
  user_id uuid not null references profiles (id) on delete cascade,
  post_id uuid not null references posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table likes enable row level security;

create policy "likes are publicly readable"
  on likes for select
  using (true);

create policy "users manage their own likes"
  on likes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- saves (private bookmarks)
-- ---------------------------------------------------------------------
create table saves (
  user_id uuid not null references profiles (id) on delete cascade,
  post_id uuid not null references posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table saves enable row level security;

create policy "users manage their own saves"
  on saves for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------
create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  parent_id uuid references comments (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table comments enable row level security;

create policy "comments are publicly readable"
  on comments for select
  using (true);

create policy "authenticated users create comments as themselves"
  on comments for insert
  with check (auth.uid() = author_id);

create policy "authors manage their own comments"
  on comments for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "authors delete their own comments"
  on comments for delete
  using (auth.uid() = author_id);

-- ---------------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------------
create table follows (
  follower_id uuid not null references profiles (id) on delete cascade,
  followee_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);

alter table follows enable row level security;

create policy "follows are publicly readable"
  on follows for select
  using (true);

create policy "users manage their own follows"
  on follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

-- ---------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'profile', 'vehicle')),
  target_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table reports enable row level security;

create policy "reporters read their own reports"
  on reports for select
  using (auth.uid() = reporter_id);

create policy "authenticated users file reports as themselves"
  on reports for insert
  with check (auth.uid() = reporter_id);

-- update/delete intentionally has no policy: only moderators (service
-- role) resolve reports. Default deny applies.

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null,
  actor_id uuid references profiles (id) on delete set null,
  target_type text,
  target_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "users read their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "users mark their own notifications read"
  on notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- insert intentionally has no client policy: notifications are written
-- server-side (trigger or service role) when the V2 feed ships.

-- ---------------------------------------------------------------------
-- maintenance
-- ---------------------------------------------------------------------
create table maintenance (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  kind text not null,
  performed_at date not null,
  mileage int,
  cost_cents bigint check (cost_cents is null or cost_cents >= 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table maintenance enable row level security;

create policy "owners manage their own maintenance records"
  on maintenance for all
  using (
    exists (
      select 1 from vehicles
      where vehicles.id = maintenance.vehicle_id
        and vehicles.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from vehicles
      where vehicles.id = maintenance.vehicle_id
        and vehicles.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- events (analytics; write-only from the client)
-- ---------------------------------------------------------------------
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete set null,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table events enable row level security;

create policy "users record their own events"
  on events for insert
  with check (auth.uid() = user_id or user_id is null);

-- no select policy: analytics are read via service role, not the client.
