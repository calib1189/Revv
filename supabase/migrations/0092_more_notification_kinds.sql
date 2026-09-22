-- Four more notification kinds, following the exact pattern every
-- notification in this app already uses (0003, 0004, 0065): a
-- security definer trigger reacting to the underlying event inserts the
-- row, never client code or a Server Action. notifications.kind has no
-- check constraint (it's a plain text column), so no ALTER is needed to
-- introduce a new one — only the trigger.
--
-- Each of these pairs with a push notification added in this same
-- change, in the Server Action that causes the event — see
-- lib/push/send.ts's callers. The trigger and the push are independent
-- side effects of the same event, exactly like every existing
-- like/comment/follow notification: Postgres can create the in-app row,
-- but only application code can call APNs/Web Push, so the two can
-- never be the same mechanism.

-- 1. Someone replies to your comment — distinct from the existing
-- handle_new_comment (which always notifies the POST's author). This
-- fires only for an actual reply and only when the parent comment's
-- author differs from both the replier and the post's author, so a
-- reply to your own top-level comment on your own post doesn't produce
-- two notifications for the same action.
create function public.handle_new_comment_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  parent_author_id uuid;
  post_author_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select author_id into parent_author_id from public.comments where id = new.parent_id;
  select author_id into post_author_id from public.posts where id = new.post_id;

  if parent_author_id is null or parent_author_id = new.author_id then
    return new;
  end if;
  if parent_author_id = post_author_id then
    -- handle_new_comment already notified this same person as "commented
    -- on your post" — a second row here would be the same reply twice.
    return new;
  end if;

  insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
  values (parent_author_id, 'comment_reply', new.author_id, 'post', new.post_id);
  return new;
end;
$$;

create trigger on_comment_reply
  after insert on comments for each row execute function public.handle_new_comment_reply();

-- 2. A meetup a host submitted clears (or doesn't clear) admin review.
-- Gated on the exact pending_review -> {active,rejected} transition —
-- see 0057's own comment for why pending_review is always the step
-- immediately before an admin decision, for both the free and paid
-- paths, so this can't misfire on an unrelated update to a meetup row.
create function public.handle_meetup_review_decision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending_review' and new.status = 'active' then
    insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
    values (new.host_id, 'meetup_approved', null, 'meetup', new.id);
  elsif old.status = 'pending_review' and new.status = 'rejected' then
    insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
    values (new.host_id, 'meetup_rejected', null, 'meetup', new.id);
  end if;
  return new;
end;
$$;

create trigger on_meetup_review_decision
  after update on meetups for each row execute function public.handle_meetup_review_decision();

-- 3. An ad campaign is approved (same pending_review -> active shape as
-- meetups, per 0042's identical review pipeline). Rejection isn't
-- covered here — narrower in scope than the meetup case on purpose,
-- easy to add the same way later.
create function public.handle_ad_campaign_approved()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending_review' and new.status = 'active' then
    insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
    values (new.advertiser_id, 'ad_approved', null, 'ad_campaign', new.id);
  end if;
  return new;
end;
$$;

create trigger on_ad_campaign_approved
  after update on ad_campaigns for each row execute function public.handle_ad_campaign_approved();

-- 4. A vehicle's ownership verification is approved — the moment a
-- build becomes leaderboard-eligible, matching listVerifiedVehicleIds's
-- own gate. Approval-only, same scope note as ad_approved above.
create function public.handle_vehicle_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.ownership_verification_status is distinct from new.ownership_verification_status
     and new.ownership_verification_status = 'approved' then
    insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
    values (new.owner_id, 'vehicle_verified', null, 'vehicle', new.id);
  end if;
  return new;
end;
$$;

create trigger on_vehicle_verified
  after update on vehicles for each row execute function public.handle_vehicle_verified();
