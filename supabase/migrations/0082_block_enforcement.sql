-- Blocking only ever actually stopped direct messages (0010/0011). It
-- never stopped a follow relationship, and the feed had no way to hide a
-- blocked user's posts, because listing "everyone I'm blocked with in
-- either direction" isn't possible through a normal client query:
-- `blocks`' own RLS ("auth.uid() = blocker_id") only lets a user see rows
-- where THEY are the blocker, so a blocked user's session can't see the
-- block row that names them — same reflection problem 0011 already fixed
-- for messaging, via the same fix: a SECURITY DEFINER function.

-- Scoped to auth.uid() internally, never a parameter — this can only
-- ever return the CALLER's own block list (both directions), never
-- anyone else's, so it can't be used to enumerate who blocked a third
-- party.
create or replace function public.blocked_user_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select blocked_id from blocks where blocker_id = auth.uid()
  union
  select blocker_id from blocks where blocked_id = auth.uid();
$$;

revoke all on function public.blocked_user_ids() from public;
grant execute on function public.blocked_user_ids() to authenticated;

-- Follows: split the old single `for all` policy into insert/delete so
-- the block check only ever gates *creating* a new follow — you can
-- always unfollow (or be left unfollowed) regardless of block state.
-- Reuses users_blocked() from 0011, which already does the same
-- direction-agnostic check for messaging.
drop policy if exists "users manage their own follows" on follows;

create policy "users create follows unless blocked"
  on follows for insert
  with check (auth.uid() = follower_id and not public.users_blocked(follower_id, followee_id));

create policy "users remove their own follows"
  on follows for delete
  using (auth.uid() = follower_id);
