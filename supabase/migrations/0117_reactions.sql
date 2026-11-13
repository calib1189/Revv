-- Reactions on DMs and comments (heart, fire, laugh, wow, sad, up): one
-- per person per message or comment, changed by updating the row.
-- Counts are computed from these rows, never stored.

create table message_reactions (
  message_id uuid not null references messages (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  reaction text not null check (reaction in ('heart', 'fire', 'laugh', 'wow', 'sad', 'up')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table message_reactions enable row level security;

-- Only the two people in the conversation see or add reactions in it.
create function public.is_message_participant(p_message uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from messages m
    join conversations c on c.id = m.conversation_id
    where m.id = p_message and auth.uid() in (c.user_a_id, c.user_b_id)
  );
$$;

create policy "participants read message reactions"
  on message_reactions for select
  using (public.is_message_participant(message_id));

create policy "participants react to messages"
  on message_reactions for insert
  with check (auth.uid() = user_id and public.is_message_participant(message_id));

create policy "people change their own message reactions"
  on message_reactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.is_message_participant(message_id));

create policy "people remove their own message reactions"
  on message_reactions for delete
  using (auth.uid() = user_id);

create table comment_reactions (
  comment_id uuid not null references comments (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  reaction text not null check (reaction in ('heart', 'fire', 'laugh', 'wow', 'sad', 'up')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index comment_reactions_comment_idx on comment_reactions (comment_id);

alter table comment_reactions enable row level security;

-- Comments are public, so their reactions are too.
create policy "comment reactions are public"
  on comment_reactions for select
  using (true);

create policy "people react to comments"
  on comment_reactions for insert
  with check (auth.uid() = user_id);

create policy "people change their own comment reactions"
  on comment_reactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "people remove their own comment reactions"
  on comment_reactions for delete
  using (auth.uid() = user_id);

-- Someone reacted to your comment (only the first reaction, not every
-- change of mind).
create function public.handle_comment_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  comment_author uuid;
  comment_post uuid;
begin
  select author_id, post_id into comment_author, comment_post from public.comments where id = new.comment_id;
  if comment_author is null or comment_author = new.user_id then
    return new;
  end if;
  insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
  values (comment_author, 'comment_reaction', new.user_id, 'post', comment_post);
  return new;
end;
$$;

create trigger on_comment_reaction
  after insert on comment_reactions for each row execute function public.handle_comment_reaction();
