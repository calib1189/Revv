-- Re-assert messaging block-enforcement policies.
--
-- Live testing (2026-08-23) found that a blocked user could still send
-- messages into an existing conversation with the user who blocked them,
-- even though the "participants send messages, unless blocked" policy in
-- 0006_messaging.sql is logically correct and the blocks row was confirmed
-- present. The policy as currently defined on the live database is not
-- rejecting the insert. Root cause unconfirmed (likely a partial/incorrect
-- apply of 0006 at the time it was run) — this migration drops and
-- recreates both block-checking policies from scratch so their live
-- definition is guaranteed to match source.

drop policy if exists "users start conversations they're part of, unless blocked" on conversations;
create policy "users start conversations they're part of, unless blocked"
  on conversations for insert
  with check (
    (auth.uid() = user_a_id or auth.uid() = user_b_id)
    and not exists (
      select 1 from blocks
      where (blocker_id = user_a_id and blocked_id = user_b_id)
         or (blocker_id = user_b_id and blocked_id = user_a_id)
    )
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
      join blocks b
        on (b.blocker_id = c.user_a_id and b.blocked_id = c.user_b_id)
        or (b.blocker_id = c.user_b_id and b.blocked_id = c.user_a_id)
      where c.id = messages.conversation_id
    )
  );
