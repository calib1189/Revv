-- REVV V2: notify post authors on likes and comments. Notifications are
-- written by triggers (security definer), never inserted by the client —
-- there is deliberately no client-facing insert policy on notifications.

create function public.handle_new_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_author_id uuid;
begin
  select author_id into v_author_id from posts where id = new.post_id;

  if v_author_id is not null and v_author_id <> new.user_id then
    insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
    values (v_author_id, 'like', new.user_id, 'post', new.post_id);
  end if;

  return new;
end;
$$;

create trigger on_like_created
  after insert on likes
  for each row execute function public.handle_new_like();

create function public.handle_new_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_author_id uuid;
begin
  select author_id into v_author_id from posts where id = new.post_id;

  if v_author_id is not null and v_author_id <> new.author_id then
    insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
    values (v_author_id, 'comment', new.author_id, 'post', new.post_id);
  end if;

  return new;
end;
$$;

create trigger on_comment_created
  after insert on comments
  for each row execute function public.handle_new_comment();
