-- Sorza Daily, part 2: community voting and results. Run after 0103.
--
-- One vote per person per challenge (the primary key), changeable until
-- the deadline. Who voted for whom is private; while a challenge is open
-- nobody sees the running counts except the total number of votes cast
-- and an entrant's own count, so early entries can't snowball just from
-- being seen winning. Counts open up the moment the challenge ends.
--
-- daily_placements is the record of who placed when a challenge was
-- settled (it drives badges and points), written only by the server.

create table daily_votes (
  challenge_id uuid not null references daily_challenges (id) on delete cascade,
  voter_id uuid not null references profiles (id) on delete cascade,
  submission_id uuid not null references daily_submissions (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (challenge_id, voter_id)
);

create index daily_votes_submission_idx on daily_votes (submission_id);

alter table daily_votes enable row level security;

create policy "voters see their own vote"
  on daily_votes for select
  using (auth.uid() = voter_id);

-- Confirmed, not banned, challenge still open, the entry belongs to that
-- challenge, and it isn't your own.
create policy "users vote in open challenges"
  on daily_votes for insert
  with check (
    auth.uid() = voter_id
    and public.is_confirmed_user()
    and not exists (select 1 from profiles where id = auth.uid() and is_banned)
    and exists (
      select 1 from daily_challenges c
      where c.id = challenge_id and now() >= c.starts_at and now() < c.ends_at
    )
    and exists (
      select 1 from daily_submissions s
      where s.id = submission_id and s.challenge_id = daily_votes.challenge_id and s.user_id <> auth.uid()
    )
  );

create policy "users change their vote until the deadline"
  on daily_votes for update
  using (
    auth.uid() = voter_id
    and exists (
      select 1 from daily_challenges c
      where c.id = challenge_id and now() >= c.starts_at and now() < c.ends_at
    )
  )
  with check (
    auth.uid() = voter_id
    and exists (
      select 1 from daily_challenges c
      where c.id = challenge_id and now() >= c.starts_at and now() < c.ends_at
    )
    and exists (
      select 1 from daily_submissions s
      where s.id = submission_id and s.challenge_id = daily_votes.challenge_id and s.user_id <> auth.uid()
    )
  );

create policy "users take back their vote until the deadline"
  on daily_votes for delete
  using (
    auth.uid() = voter_id
    and exists (select 1 from daily_challenges c where c.id = challenge_id and now() < c.ends_at)
  );

-- Per-entry counts, only once the challenge has ended.
create or replace function public.daily_vote_counts(p_challenge_id uuid)
returns table (submission_id uuid, votes bigint)
language sql
security definer set search_path = public
stable
as $$
  select s.id, count(v.voter_id)
  from daily_submissions s
  left join daily_votes v on v.submission_id = s.id
  where s.challenge_id = p_challenge_id
    and exists (select 1 from daily_challenges c where c.id = p_challenge_id and c.ends_at <= now())
  group by s.id;
$$;

-- Total votes cast in a challenge, any time. Shows the competition is
-- real without giving away who's ahead.
create or replace function public.daily_vote_total(p_challenge_id uuid)
returns bigint
language sql
security definer set search_path = public
stable
as $$
  select count(*) from daily_votes where challenge_id = p_challenge_id;
$$;

-- How many votes the caller's own entry has, any time.
create or replace function public.my_daily_entry_votes(p_challenge_id uuid)
returns bigint
language sql
security definer set search_path = public
stable
as $$
  select count(v.voter_id)
  from daily_submissions s
  join daily_votes v on v.submission_id = s.id
  where s.challenge_id = p_challenge_id and s.user_id = auth.uid();
$$;

revoke all on function public.daily_vote_counts(uuid) from public;
revoke all on function public.daily_vote_total(uuid) from public;
revoke all on function public.my_daily_entry_votes(uuid) from public;
grant execute on function public.daily_vote_counts(uuid) to anon, authenticated, service_role;
grant execute on function public.daily_vote_total(uuid) to anon, authenticated, service_role;
grant execute on function public.my_daily_entry_votes(uuid) to authenticated;

alter table daily_challenges add column results_finalized_at timestamptz;

create table daily_placements (
  challenge_id uuid not null references daily_challenges (id) on delete cascade,
  submission_id uuid not null references daily_submissions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  place smallint not null check (place between 1 and 3),
  votes integer not null check (votes > 0),
  created_at timestamptz not null default now(),
  primary key (challenge_id, submission_id)
);

create index daily_placements_user_idx on daily_placements (user_id, place);

alter table daily_placements enable row level security;

create policy "placements are publicly readable"
  on daily_placements for select
  using (true);
-- No insert/update/delete policies: only the server (service role)
-- settles a challenge, from the votes themselves.
