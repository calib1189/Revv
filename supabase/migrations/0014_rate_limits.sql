-- Rate limiting for posts, comments, messages, and reports — enforced at
-- the RLS level so it holds even against a direct REST call, not just
-- through the app's server actions. Each check is a small explicit
-- SECURITY DEFINER function (not a generic dynamic-SQL helper) so the
-- logic is easy to read and audit — this is exactly the kind of code
-- where a subtle bug is expensive (see 0011's writeup on the blocks bug).
--
-- Limits are deliberately generous for legitimate use and block obvious
-- automated abuse:
--   posts:    10 / hour   — a real user posts occasionally, not by the dozen
--   comments: 30 / 10 min — active discussion is fine, flood bots are not
--   messages: 60 / 10 min — real chat is bursty, this still allows it
--   reports:  20 / hour   — plenty for a legitimate spam wave, blocks
--                           weaponized mass-reporting of a rival's content

create or replace function public.under_post_rate_limit(p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select count(*) < 10
  from posts
  where author_id = p_user_id
    and created_at > now() - interval '1 hour';
$$;

create or replace function public.under_comment_rate_limit(p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select count(*) < 30
  from comments
  where author_id = p_user_id
    and created_at > now() - interval '10 minutes';
$$;

create or replace function public.under_message_rate_limit(p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select count(*) < 60
  from messages
  where sender_id = p_user_id
    and created_at > now() - interval '10 minutes';
$$;

create or replace function public.under_report_rate_limit(p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select count(*) < 20
  from reports
  where reporter_id = p_user_id
    and created_at > now() - interval '1 hour';
$$;

revoke all on function public.under_post_rate_limit(uuid) from public;
revoke all on function public.under_comment_rate_limit(uuid) from public;
revoke all on function public.under_message_rate_limit(uuid) from public;
revoke all on function public.under_report_rate_limit(uuid) from public;
grant execute on function public.under_post_rate_limit(uuid) to authenticated;
grant execute on function public.under_comment_rate_limit(uuid) to authenticated;
grant execute on function public.under_message_rate_limit(uuid) to authenticated;
grant execute on function public.under_report_rate_limit(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- posts: split the single "for all" policy (0001) into per-command
-- policies so the rate limit applies only to insert, never blocking a
-- user from editing or deleting their own existing posts.
-- ---------------------------------------------------------------------
drop policy if exists "authors manage their own posts" on posts;

create policy "authors insert their own posts"
  on posts for insert
  with check (
    auth.uid() = author_id
    and public.under_post_rate_limit(auth.uid())
  );

create policy "authors update their own posts"
  on posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "authors delete their own posts"
  on posts for delete
  using (auth.uid() = author_id);

-- ---------------------------------------------------------------------
-- comments: already has a dedicated insert policy (0001) — extend it.
-- ---------------------------------------------------------------------
drop policy if exists "authenticated users create comments as themselves" on comments;

create policy "authenticated users create comments as themselves"
  on comments for insert
  with check (
    auth.uid() = author_id
    and public.under_comment_rate_limit(auth.uid())
  );

-- ---------------------------------------------------------------------
-- messages: extend the block-checking insert policy from 0011.
-- ---------------------------------------------------------------------
drop policy if exists "participants send messages, unless blocked" on messages;

create policy "participants send messages, unless blocked"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and public.under_message_rate_limit(auth.uid())
    and exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
        and (conversations.user_a_id = auth.uid() or conversations.user_b_id = auth.uid())
    )
    and not exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and public.users_blocked(c.user_a_id, c.user_b_id)
    )
  );

-- ---------------------------------------------------------------------
-- reports: already has a dedicated insert policy (0001) — extend it.
-- ---------------------------------------------------------------------
drop policy if exists "authenticated users file reports as themselves" on reports;

create policy "authenticated users file reports as themselves"
  on reports for insert
  with check (
    auth.uid() = reporter_id
    and public.under_report_rate_limit(auth.uid())
  );
