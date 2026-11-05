-- Three more kinds of push notification, each with its own switch in
-- Settings → Notifications (see 0094 for the table):
--   ratings      someone rates your car 1-5 stars for the first time
--   leaderboard  you lose #1, or get pushed out of the top 10
--   challenges   the weekly challenges reset (Mondays)
-- Default on, same as every other category: no row still means "all on".
alter table notification_preferences
  add column ratings boolean not null default true,
  add column leaderboard boolean not null default true,
  add column challenges boolean not null default true;

-- The Activity entry for a new star rating, written by a trigger like
-- every other notification row (0003, 0004, 0092). Insert only: changing
-- a rating you already gave is not a new event, and the push in
-- submitPeerRatingAction follows the same rule. The table already
-- blocks rating your own car (0074), so there is no self-notification
-- case to guard here beyond that.
create function public.handle_new_peer_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  owner uuid;
begin
  select owner_id into owner from public.vehicles where id = new.vehicle_id;
  if owner is null or owner = new.rater_id then
    return new;
  end if;

  insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
  values (owner, 'peer_rating', new.rater_id, 'vehicle', new.vehicle_id);
  return new;
end;
$$;

create trigger on_peer_rating_insert
  after insert on peer_ratings for each row execute function public.handle_new_peer_rating();
