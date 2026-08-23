-- REVV V3: notify a user when someone follows them. Same pattern as the
-- like/comment triggers from 0003 — self-follows are already blocked by
-- the follows_not_self check constraint, so no guard needed here.

create function public.handle_new_follow()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
  values (new.followee_id, 'follow', new.follower_id, 'profile', new.follower_id);
  return new;
end;
$$;

create trigger on_follow_created
  after insert on follows
  for each row execute function public.handle_new_follow();
