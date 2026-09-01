-- Lets a post or meetup optionally belong to a crew — same nullable-FK
-- shape as posts.vehicle_id / posts.build_id (0001_init.sql), not a new
-- join table, since a post/meetup belongs to at most one crew.

alter table posts add column crew_id uuid references crews (id) on delete set null;
alter table meetups add column crew_id uuid references crews (id) on delete set null;

create index posts_crew_id_idx on posts (crew_id) where crew_id is not null;
create index meetups_crew_id_idx on meetups (crew_id) where crew_id is not null;

-- ---------------------------------------------------------------------
-- RESTRICTIVE policies — the first in this codebase; everything else is
-- permissive-only. A restrictive policy ANDs against the OR'd set of
-- permissive policies for the same command, so it can narrow default
-- visibility down rather than only add to it.
--
-- posts' existing select policy is a plain "posts are publicly readable"
-- using (true) (0001_init.sql, untouched) — so admins already see every
-- post today via that same blanket policy, with no separate admin
-- carve-out to preserve.
--
-- meetups' select policy is NOT a plain using(true) anymore: 0043
-- replaced it with "active meetups are publicly readable" (status =
-- 'active') + "hosts read their own regardless of status", and 0057
-- added "admins read all meetups". Both restrictive policies below
-- explicitly include an is_admin bypass so a moderator reviewing a
-- reported post, or an admin reviewing a pending meetup, is never blocked
-- from seeing it just because it happens to be tagged to a private crew
-- they don't belong to.
-- ---------------------------------------------------------------------
create policy "crew-tagged posts respect private crew visibility"
  on posts as restrictive
  for select
  using (
    crew_id is null
    or exists (select 1 from crews where crews.id = posts.crew_id and crews.visibility = 'public')
    or auth.uid() = author_id
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or exists (
      select 1 from crew_members
      where crew_members.crew_id = posts.crew_id
        and crew_members.user_id = auth.uid()
        and crew_members.status = 'approved'
    )
  );

create policy "crew-tagged meetups respect private crew visibility"
  on meetups as restrictive
  for select
  using (
    crew_id is null
    or exists (select 1 from crews where crews.id = meetups.crew_id and crews.visibility = 'public')
    or auth.uid() = host_id
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or exists (
      select 1 from crew_members
      where crew_members.crew_id = meetups.crew_id
        and crew_members.user_id = auth.uid()
        and crew_members.status = 'approved'
    )
  );

-- ---------------------------------------------------------------------
-- Notifications — trigger-based only, same pattern as 0003/0004
-- (handle_new_like / handle_new_comment / handle_new_follow). There is no
-- client insert policy on notifications, by design (0001_init.sql).
-- ---------------------------------------------------------------------

-- 1. Someone requests to join your (private) crew → notify every
--    approved leader/admin of that crew, excluding the requester
--    themselves (can't happen today since a leader/admin is already an
--    approved member and couldn't insert a second 'pending' row anyway,
--    but kept for safety/clarity).
create function public.handle_new_crew_join_request()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'pending' then
    insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
    select cm.user_id, 'crew_join_request', new.user_id, 'crew', new.crew_id
    from crew_members cm
    where cm.crew_id = new.crew_id
      and cm.status = 'approved'
      and cm.role in ('leader', 'admin')
      and cm.user_id <> new.user_id;
  end if;
  return new;
end;
$$;

create trigger on_crew_member_requested
  after insert on crew_members
  for each row execute function public.handle_new_crew_join_request();

-- 2. Your join request was approved → notify the requester. actor_id is
--    auth.uid() (whoever performed the approving UPDATE), the same
--    "actor is whoever caused this row's own change" idea
--    handle_new_follow uses for new.follower_id.
create function public.handle_crew_join_approved()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status = 'pending' and new.status = 'approved' then
    insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
    values (new.user_id, 'crew_join_approved', auth.uid(), 'crew', new.crew_id);
  end if;
  return new;
end;
$$;

create trigger on_crew_member_approved
  after update on crew_members
  for each row execute function public.handle_crew_join_approved();

-- 3. A new post lands in a crew you belong to → notify every other
--    approved member of that crew. Fires only when posts.crew_id is set.
create function public.handle_new_crew_post()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.crew_id is not null then
    insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
    select cm.user_id, 'crew_post', new.author_id, 'post', new.id
    from crew_members cm
    where cm.crew_id = new.crew_id
      and cm.status = 'approved'
      and cm.user_id <> new.author_id;
  end if;
  return new;
end;
$$;

create trigger on_crew_post_created
  after insert on posts
  for each row execute function public.handle_new_crew_post();
