-- REVV V12: 1:1 direct messages + blocking.

create table blocks (
  blocker_id uuid not null references profiles (id) on delete cascade,
  blocked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

alter table blocks enable row level security;

create policy "users manage their own blocks"
  on blocks for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

-- ---------------------------------------------------------------------
-- conversations: one row per unique pair of users. user_a_id is always
-- the smaller uuid so (a, b) and (b, a) can't both exist.
-- ---------------------------------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references profiles (id) on delete cascade,
  user_b_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_ordered_pair check (user_a_id < user_b_id),
  unique (user_a_id, user_b_id)
);

alter table conversations enable row level security;

create policy "participants read their conversations"
  on conversations for select
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

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

-- ---------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table messages enable row level security;

create policy "participants read messages in their conversations"
  on messages for select
  using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
        and (conversations.user_a_id = auth.uid() or conversations.user_b_id = auth.uid())
    )
  );

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

create policy "recipients mark messages read"
  on messages for update
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
        and (conversations.user_a_id = auth.uid() or conversations.user_b_id = auth.uid())
    )
  )
  with check (sender_id <> auth.uid());
