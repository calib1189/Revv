-- Interactive story stickers, and notifications for them.
--
-- Polls: one vote per viewer per poll (a poll is a layer in the story's
-- design, identified by its layer id). Voters see the tallies through
-- story_poll_counts (counts only, never who); the story's author can
-- read the votes themselves.
--
-- Questions: a viewer's answer goes privately to the story's author.
--
-- Notifications follow the pattern every notification here uses (0003,
-- 0092): a security definer trigger writes the in-app row; the push is
-- sent by the Server Action that causes the event.

create table story_poll_votes (
  story_id uuid not null references stories (id) on delete cascade,
  layer_id text not null check (char_length(layer_id) <= 40),
  voter_id uuid not null references profiles (id) on delete cascade,
  option smallint not null check (option in (0, 1)),
  created_at timestamptz not null default now(),
  primary key (story_id, layer_id, voter_id)
);

alter table story_poll_votes enable row level security;

create policy "viewers vote on live stories"
  on story_poll_votes for insert
  with check (
    auth.uid() = voter_id
    and exists (select 1 from stories s where s.id = story_id and s.expires_at > now())
  );

create policy "voters and story authors read poll votes"
  on story_poll_votes for select
  using (
    auth.uid() = voter_id
    or exists (select 1 from stories s where s.id = story_id and s.author_id = auth.uid())
  );

-- Tallies for a story's polls, readable by anyone who can see the story.
create function public.story_poll_counts(p_story uuid)
returns table (layer_id text, option smallint, votes bigint)
language sql stable security definer set search_path = public as $$
  select v.layer_id, v.option, count(*)
  from story_poll_votes v
  where v.story_id = p_story
    and exists (
      select 1 from stories s
      where s.id = p_story and (s.expires_at > now() or s.author_id = auth.uid())
    )
  group by v.layer_id, v.option;
$$;

grant execute on function public.story_poll_counts(uuid) to anon, authenticated;

create table story_question_answers (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories (id) on delete cascade,
  layer_id text not null check (char_length(layer_id) <= 40),
  responder_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

create index story_question_answers_story_idx on story_question_answers (story_id, created_at desc);

alter table story_question_answers enable row level security;

create policy "viewers answer questions on live stories"
  on story_question_answers for insert
  with check (
    auth.uid() = responder_id
    and exists (select 1 from stories s where s.id = story_id and s.expires_at > now())
  );

create policy "responders and story authors read answers"
  on story_question_answers for select
  using (
    auth.uid() = responder_id
    or exists (select 1 from stories s where s.id = story_id and s.author_id = auth.uid())
  );

create policy "story authors delete answers"
  on story_question_answers for delete
  using (exists (select 1 from stories s where s.id = story_id and s.author_id = auth.uid()));

-- You were @mentioned in a story. Only real mentions count: the
-- mention's user id has to belong to the username it shows, it's never
-- the author themselves, nobody blocked either way, and at most ten per
-- story.
create function public.handle_story_mentions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.design is null or jsonb_typeof(new.design -> 'layers') <> 'array' then
    return new;
  end if;
  insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
  select distinct p.id, 'story_mention', new.author_id, 'story', new.id
  from jsonb_array_elements(new.design -> 'layers') as l
  join public.profiles p
    on p.id::text = l ->> 'userId'
   and lower(p.username) = lower(l ->> 'username')
  where l ->> 'kind' = 'mention'
    and p.id <> new.author_id
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = p.id and b.blocked_id = new.author_id)
         or (b.blocker_id = new.author_id and b.blocked_id = p.id)
    )
  limit 10;
  return new;
end;
$$;

create trigger on_story_mentions
  after insert on stories for each row execute function public.handle_story_mentions();

-- Someone answered the question on your story.
create function public.handle_story_answer()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  story_author uuid;
begin
  select author_id into story_author from public.stories where id = new.story_id;
  if story_author is null or story_author = new.responder_id then
    return new;
  end if;
  insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
  values (story_author, 'story_answer', new.responder_id, 'story', new.story_id);
  return new;
end;
$$;

create trigger on_story_answer
  after insert on story_question_answers for each row execute function public.handle_story_answer();
