-- Real fix for block enforcement (0010 did not actually fix it).
--
-- Root cause: the "participants send messages, unless blocked" and
-- "users start conversations ... unless blocked" policies check for a
-- block via a subquery against `blocks`. But `blocks` has its own RLS
-- policy — "auth.uid() = blocker_id" — which only lets a user see rows
-- where THEY are the blocker. RLS applies inside policy subqueries too,
-- evaluated as the calling user. So when the *blocked* user (not the
-- blocker) sends a message, the subquery runs as them, can't see the
-- block row (they're not the blocker on it), "not exists" comes back
-- true, and the insert is wrongly allowed.
--
-- Fix: check for a block via a SECURITY DEFINER function, which runs
-- with the privileges of its owner and so bypasses `blocks`' RLS
-- entirely — giving a truthful answer regardless of which of the two
-- users is asking. This also preserves the existing privacy property
-- that a blocked user still can't directly SELECT from `blocks` to see
-- who blocked them.

create or replace function public.users_blocked(user_x uuid, user_y uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from blocks
    where (blocker_id = user_x and blocked_id = user_y)
       or (blocker_id = user_y and blocked_id = user_x)
  );
$$;

revoke all on function public.users_blocked(uuid, uuid) from public;
grant execute on function public.users_blocked(uuid, uuid) to authenticated;

drop policy if exists "users start conversations they're part of, unless blocked" on conversations;
create policy "users start conversations they're part of, unless blocked"
  on conversations for insert
  with check (
    (auth.uid() = user_a_id or auth.uid() = user_b_id)
    and not public.users_blocked(user_a_id, user_b_id)
  );

drop policy if exists "participants send messages, unless blocked" on messages;
create policy "participants send messages, unless blocked"
  on messages for insert
  with check (
    sender_id = auth.uid()
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
