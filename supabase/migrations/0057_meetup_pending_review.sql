-- Meetups now go through the same admin review step ad campaigns already
-- have, instead of going straight from payment to 'active'. 0043's
-- original reasoning ("a meetup is a normal community listing, not paid
-- content interspersed into the feed, so the reports system is enough of
-- a moderation backstop") turned out not to hold up in practice — same
-- rationale reversal, same drop/recreate approach as 0054.

alter table meetups drop constraint meetups_status_check;
alter table meetups add constraint meetups_status_check
  check (status in ('pending_payment', 'pending_review', 'active', 'rejected'));

-- Meetups had no admin read/write policy at all before this — ad_campaigns
-- has had both since 0042. Read is needed so the review queue can list
-- pending_review rows regardless of host; write is needed so
-- pending_review -> active/rejected has anywhere to happen other than the
-- Stripe webhook, which only ever sets pending_review now (see the
-- application-level change alongside this migration).
create policy "admins read all meetups"
  on meetups for select
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admins update any meetup"
  on meetups for update
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
