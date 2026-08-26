-- Car meets now require payment to post — free listings were an open
-- invitation for spam, and it doubles as marketing for real meets. Same
-- "money handled server-side only" principle as 0042_ad_campaigns: a
-- host's own session can only create a meetup in the unpaid draft state,
-- and can never move it out of that state itself. Only the Stripe
-- webhook (service role) can flip it to 'active'.
--
-- A 'promoted' tier costs more and sorts ahead of every 'standard' meetup
-- regardless of distance (enforced in the app query, not here) — the same
-- "pay for more visibility" idea as ad campaigns, just for a listing
-- instead of a feed placement. There's no review step like ad campaigns
-- have: a meetup is a normal community listing (title/description/
-- location/time), not paid content interspersed into the main feed, so
-- the existing reports system is the moderation backstop, not a
-- pre-publish gate.

alter table meetups
  add column status text not null default 'pending_payment' check (status in ('pending_payment', 'active')),
  add column tier text not null default 'standard' check (tier in ('standard', 'promoted')),
  add column price_cents int not null default 0,
  add column stripe_checkout_session_id text;

-- Grandfather in meetups posted before payment was required — only new
-- inserts (forced to start at 'pending_payment' by the policy below) need
-- to actually pay to reach 'active'.
update meetups set status = 'active' where status = 'pending_payment';

drop policy "meetups are publicly readable" on meetups;
drop policy "hosts manage their own meetups" on meetups;

create policy "active meetups are publicly readable"
  on meetups for select
  using (status = 'active');

create policy "hosts read their own meetups regardless of status"
  on meetups for select
  using (auth.uid() = host_id);

-- The only thing a host's own session can ever insert is their own
-- brand-new, unpaid draft — never anything already active.
create policy "hosts create their own draft meetup"
  on meetups for insert
  with check (auth.uid() = host_id and status = 'pending_payment');

create policy "hosts delete their own meetups"
  on meetups for delete
  using (auth.uid() = host_id);

-- Deliberately no update policy for the host at all — payment
-- confirmation (pending_payment -> active) happens in the Stripe webhook
-- via the service role, which bypasses RLS entirely. There is no path for
-- a host's own session to move their meetup's status (or anything else
-- about it) at all.

create index meetups_status_idx on meetups (status);
