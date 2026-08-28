-- A real account-level enforcement lever for admins — previously the
-- only moderation action available (removeReportedContentAction) could
-- delete one piece of content but had no way to stop the same person
-- from immediately posting the same thing again. is_banned blocks new
-- posts and comments at the RLS layer, not just in application code, so
-- there's no path around it from a tampered client request.
--
-- Deliberately scoped to posting/commenting, not a full account lockout
-- (this doesn't touch login/auth) — that's a larger, separate feature if
-- ever needed.

alter table profiles add column is_banned boolean not null default false;
alter table profiles add column banned_at timestamptz;

drop policy "authors insert their own posts" on posts;
create policy "authors insert their own posts"
  on posts for insert
  with check (
    auth.uid() = author_id
    and public.under_post_rate_limit(auth.uid())
    and not exists (select 1 from profiles where id = auth.uid() and is_banned)
  );

drop policy "authenticated users create comments as themselves" on comments;
create policy "authenticated users create comments as themselves"
  on comments for insert
  with check (
    auth.uid() = author_id
    and public.under_comment_rate_limit(auth.uid())
    and not exists (select 1 from profiles where id = auth.uid() and is_banned)
  );
