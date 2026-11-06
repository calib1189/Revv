-- Tell a host when someone says they're going to their meet. Run after
-- 0098_meetup_attendees.sql.
--
-- Two halves, same as 0097:
--   * the Activity entry, written by a trigger like every other
--     notification row (0003, 0004, 0092, 0097);
--   * a new "meets" switch in Settings → Notifications for the push,
--     default on like every other category (no row still means all on).

alter table notification_preferences
  add column meets boolean not null default true;

-- Insert only: switching which car you're bringing is an update, not a
-- new person going, and the push in attendMeetupAction follows the same
-- rule. A host saying they're going to their own meet isn't news to them.
create function public.handle_new_meetup_attendee()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  host uuid;
begin
  select host_id into host from public.meetups where id = new.meetup_id;
  if host is null or host = new.user_id then
    return new;
  end if;

  insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
  values (host, 'meetup_attending', new.user_id, 'meetup', new.meetup_id);
  return new;
end;
$$;

create trigger on_meetup_attendee_insert
  after insert on meetup_attendees for each row execute function public.handle_new_meetup_attendee();
