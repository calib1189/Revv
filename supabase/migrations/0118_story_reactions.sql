-- Reactions on stories: one per viewer per story (heart, fire, laugh,
-- wow, sad, up), the same six as DMs and comments (0117). Only the
-- story's author sees who reacted with what; the reactor sees their own.

create table story_reactions (
  story_id uuid not null references stories (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  reaction text not null check (reaction in ('heart', 'fire', 'laugh', 'wow', 'sad', 'up')),
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

alter table story_reactions enable row level security;

create policy "viewers react to live stories"
  on story_reactions for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from stories s where s.id = story_id and s.expires_at > now() and s.author_id <> auth.uid())
  );

create policy "viewers change their own story reactions"
  on story_reactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "viewers remove their own story reactions"
  on story_reactions for delete
  using (auth.uid() = user_id);

create policy "reactors and story authors read story reactions"
  on story_reactions for select
  using (
    auth.uid() = user_id
    or exists (select 1 from stories s where s.id = story_id and s.author_id = auth.uid())
  );

-- Someone reacted to your story (the first reaction, not each change).
create function public.handle_story_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  story_author uuid;
begin
  select author_id into story_author from public.stories where id = new.story_id;
  if story_author is null or story_author = new.user_id then
    return new;
  end if;
  insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
  values (story_author, 'story_reaction', new.user_id, 'story', new.story_id);
  return new;
end;
$$;

create trigger on_story_reaction
  after insert on story_reactions for each row execute function public.handle_story_reaction();
