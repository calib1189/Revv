-- Fixes a production-breaking bug in 0064_crews.sql: four crew_members
-- policies query crew_members from *within* crew_members' own policy
-- definitions (the "acting"/"viewer" self-joins), which Postgres
-- evaluates by re-applying crew_members' own row-security to resolve the
-- inner query — including the very policy being evaluated — causing
-- genuine infinite recursion ("infinite recursion detected in policy for
-- relation crew_members", error 42P17). Because 0065's RESTRICTIVE
-- policies on posts/meetups also reference crew_members, this broke
-- every query touching posts or meetups too, not just crew pages —
-- feed, leaderboard, anything rendering a post.
--
-- The standard fix (documented by Supabase for exactly this pattern):
-- move the self-referential lookup into a SECURITY DEFINER function.
-- Such a function runs as its owner rather than the calling role, which
-- bypasses crew_members' RLS for its own internal query — the same
-- mechanism handle_new_crew() already relies on to insert a leader row
-- without tripping the insert policy. Calling that function from a
-- policy is not a self-referential query anymore from RLS's point of
-- view, so the recursion never starts.

create function public.is_approved_crew_member(p_crew_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from crew_members
    where crew_id = p_crew_id and user_id = p_user_id and status = 'approved'
  );
$$;

create function public.is_crew_leader_or_admin(p_crew_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from crew_members
    where crew_id = p_crew_id
      and user_id = p_user_id
      and status = 'approved'
      and role in ('leader', 'admin')
  );
$$;

drop policy "approved members see the full approved roster of their crew" on crew_members;
create policy "approved members see the full approved roster of their crew"
  on crew_members for select
  using (status = 'approved' and public.is_approved_crew_member(crew_members.crew_id, auth.uid()));

drop policy "crew leaders and admins see every row in their crew, including pending" on crew_members;
create policy "crew leaders and admins see every row in their crew, including pending"
  on crew_members for select
  using (public.is_crew_leader_or_admin(crew_members.crew_id, auth.uid()));

drop policy "crew leaders and admins manage other members' role and status" on crew_members;
create policy "crew leaders and admins manage other members' role and status"
  on crew_members for update
  using (public.is_crew_leader_or_admin(crew_members.crew_id, auth.uid()))
  with check (public.is_crew_leader_or_admin(crew_members.crew_id, auth.uid()));

drop policy "members leave their own row, leaders and admins remove others" on crew_members;
create policy "members leave their own row, leaders and admins remove others"
  on crew_members for delete
  using (
    auth.uid() = user_id
    or public.is_crew_leader_or_admin(crew_members.crew_id, auth.uid())
  );
