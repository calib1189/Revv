-- 0066 fixed crew_members' self-referential recursion, but missed the
-- other half of the same cycle: crews' own "private crews are readable"
-- policy still does a raw exists() against crew_members, and
-- crew_members' "approved crew_members of public crews are publicly
-- readable" policy does a raw exists() against crews. Evaluating either
-- one now requires evaluating the other table's RLS, which requires
-- evaluating the first one again — infinite recursion, just moved one
-- table over ("infinite recursion detected in policy for relation
-- crews", error 42P17).
--
-- Same fix as 0066: replace the raw crew_members lookup in crews' policy
-- with the is_approved_crew_member() security definer function that
-- already exists from 0066, so evaluating crews' policy never touches
-- crew_members' RLS at all. That's sufficient to break the cycle
-- entirely — crew_members' policy can keep querying crews directly,
-- since crews' policies no longer query crew_members in a way that
-- re-triggers row security.

drop policy "private crews are readable by the owner and approved members" on crews;
create policy "private crews are readable by the owner and approved members"
  on crews for select
  using (
    visibility = 'private'
    and (auth.uid() = owner_id or public.is_approved_crew_member(crews.id, auth.uid()))
  );
