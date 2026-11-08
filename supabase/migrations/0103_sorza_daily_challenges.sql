-- Sorza Daily, part 1: one photo challenge per day, and people's entries.
--
-- A day is midnight to midnight US Central (see src/lib/daily/day.ts);
-- each row stores its own starts_at/ends_at so the database can enforce
-- the deadline itself, not just the app. A date with no challenge
-- scheduled by an admin gets one from the weekday rotation, created by
-- the server (service role) the first time anyone needs it.
--
-- Votes, results, points and notifications come in later migrations.

create table daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  title text not null check (char_length(title) between 1 and 60),
  description text not null check (char_length(description) between 1 and 280),
  -- Which built-in visual to show when there's no cover photo.
  icon text not null default 'flag'
    check (icon in ('engine', 'wheel', 'steering', 'seat', 'gauge', 'wrench', 'star', 'flag')),
  cover_media_id uuid references media (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

alter table daily_challenges enable row level security;

-- Today's and past challenges are public; future ones stay hidden from
-- everyone but admins, who schedule them.
create policy "started daily challenges are publicly readable"
  on daily_challenges for select
  using (
    starts_at <= now()
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admins schedule daily challenges"
  on daily_challenges for insert
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "admins edit daily challenges"
  on daily_challenges for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "admins delete daily challenges that haven't started"
  on daily_challenges for delete
  using (
    starts_at > now()
    and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Whether the signed-in user has confirmed their email. Entering and
-- voting both require it, which keeps throwaway signups out.
create or replace function public.is_confirmed_user()
returns boolean
language sql
security definer set search_path = public, auth
stable
as $$
  select exists (
    select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null
  );
$$;

revoke all on function public.is_confirmed_user() from public;
grant execute on function public.is_confirmed_user() to authenticated;

create table daily_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references daily_challenges (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  vehicle_id uuid references vehicles (id) on delete set null,
  media_id uuid not null references media (id) on delete cascade,
  caption text check (caption is null or char_length(caption) <= 150),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create index daily_submissions_challenge_idx on daily_submissions (challenge_id, created_at);
create index daily_submissions_user_idx on daily_submissions (user_id, created_at desc);

alter table daily_submissions enable row level security;

-- Readable exactly when its challenge is (the subquery runs under
-- daily_challenges' own policy above).
create policy "entries are readable with their challenge"
  on daily_submissions for select
  using (exists (select 1 from daily_challenges c where c.id = challenge_id));

-- One entry per person per challenge (the unique key), only while that
-- challenge is open, only with your own photo and your own car, and not
-- while banned (0055).
create policy "users enter open challenges"
  on daily_submissions for insert
  with check (
    auth.uid() = user_id
    and public.is_confirmed_user()
    and not exists (select 1 from profiles where id = auth.uid() and is_banned)
    and exists (
      select 1 from daily_challenges c
      where c.id = challenge_id and now() >= c.starts_at and now() < c.ends_at
    )
    and exists (select 1 from media m where m.id = media_id and m.owner_id = auth.uid() and m.kind = 'image')
    and (vehicle_id is null or exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid()))
  );

create policy "users edit their entry until the deadline"
  on daily_submissions for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from daily_challenges c
      where c.id = challenge_id and now() >= c.starts_at and now() < c.ends_at
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from daily_challenges c
      where c.id = challenge_id and now() >= c.starts_at and now() < c.ends_at
    )
    and exists (select 1 from media m where m.id = media_id and m.owner_id = auth.uid() and m.kind = 'image')
    and (vehicle_id is null or exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid()))
  );

create policy "users remove their entry until the deadline"
  on daily_submissions for delete
  using (
    auth.uid() = user_id
    and exists (
      select 1 from daily_challenges c
      where c.id = challenge_id and now() < c.ends_at
    )
  );

create policy "admins remove any entry"
  on daily_submissions for delete
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Entries can be reported like posts, comments and shop reviews.
alter table reports drop constraint reports_target_type_check;
alter table reports add constraint reports_target_type_check
  check (target_type in ('post', 'comment', 'profile', 'vehicle', 'shop_review', 'daily_submission'));
