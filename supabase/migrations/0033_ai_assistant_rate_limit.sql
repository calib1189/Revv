-- sendChatMessageAction (the REVV AI assistant) already checks auth, but
-- has no rate limit at all — same billed-AI-call gap as 0031/0032, just
-- lower per-call cost and volume risk than per-photo vision/image-gen
-- calls, which is why it's being closed after those rather than
-- alongside them.

create table ai_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table ai_assistant_messages enable row level security;

create policy "users record their own assistant messages"
  on ai_assistant_messages for insert
  with check (auth.uid() = user_id);

create index ai_assistant_messages_user_id_created_at_idx
  on ai_assistant_messages (user_id, created_at);

-- Higher cap than identify/visualize — a real back-and-forth
-- conversation sends many messages in a normal session, unlike "identify
-- this one photo" or "generate this one visualization".
create or replace function public.under_ai_assistant_rate_limit(p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select count(*) < 60
  from ai_assistant_messages
  where user_id = p_user_id
    and created_at > now() - interval '1 hour';
$$;

revoke all on function public.under_ai_assistant_rate_limit(uuid) from public;
grant execute on function public.under_ai_assistant_rate_limit(uuid) to authenticated;
