-- Pop-up posts: a post from the support account (or an admin) that pops up
-- once for every member the next time they open the app, until
-- announcement_until passes or the post is deleted. Seen-once tracking
-- reuses announcement_views (0122) under the id 'post_<post id>'.

-- Who may post one. Separate from is_admin so the support account can
-- announce without getting moderation powers.
alter table profiles add column if not exists can_announce boolean not null default false;

update profiles set can_announce = true where username = 'sorzasupport';

-- Same protection as is_admin (0012): a logged-in client can never grant
-- this to itself. Direct SQL and the service role are untouched.
create or replace function public.protect_can_announce_column()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and new.can_announce is distinct from old.can_announce then
    new.can_announce := old.can_announce;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_can_announce_column on profiles;
create trigger protect_can_announce_column
  before update on profiles
  for each row execute function public.protect_can_announce_column();

-- When the pop-up stops showing. Null for every ordinary post.
alter table posts add column if not exists announcement_until timestamptz;

-- Only an account allowed to announce can set it (to anything but null);
-- anyone else's attempt is quietly dropped, the post itself still saves.
-- Clearing it (ending a pop-up early) is always allowed on your own post.
create or replace function public.guard_post_announcement()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() = 'authenticated'
     and new.announcement_until is not null
     and new.announcement_until is distinct from (case when tg_op = 'UPDATE' then old.announcement_until else null end)
     and not exists (
       select 1 from profiles where id = auth.uid() and (is_admin or can_announce)
     ) then
    new.announcement_until := case when tg_op = 'UPDATE' then old.announcement_until else null end;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_post_announcement on posts;
create trigger guard_post_announcement
  before insert or update on posts
  for each row execute function public.guard_post_announcement();

create index if not exists posts_active_announcement_idx
  on posts (announcement_until desc)
  where announcement_until is not null;
