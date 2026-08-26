-- Self-serve ad infrastructure: a business (any REVV account, no
-- separate account type) creates a campaign, pays through Stripe, and
-- an admin reviews it before it actually shows in the feed. Same
-- "money is handled server-side only" principle as 0007_subscriptions:
-- a user's own session can create a campaign in the unpaid draft state
-- and nothing else — payment confirmation (webhook) and approval
-- (admin action) both write with elevated privilege the client never
-- has, so no user session can fake a payment or self-approve their ad
-- into the feed.

create table ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references profiles (id) on delete cascade,
  headline text not null,
  caption text,
  media_id uuid not null references media (id) on delete restrict,
  destination_url text not null,
  tier text not null check (tier in ('starter', 'standard', 'featured')),
  price_cents int not null,
  duration_days int not null,
  status text not null default 'pending_payment' check (
    status in ('pending_payment', 'pending_review', 'active', 'rejected', 'ended')
  ),
  stripe_checkout_session_id text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table ad_campaigns enable row level security;

create policy "advertisers read their own campaigns"
  on ad_campaigns for select
  using (auth.uid() = advertiser_id);

create policy "active campaigns are publicly readable"
  on ad_campaigns for select
  using (status = 'active');

create policy "admins read all campaigns"
  on ad_campaigns for select
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- The only thing a normal user session can ever insert is their own
-- brand-new, unpaid draft — never anything already active or approved.
create policy "advertisers create their own draft campaign"
  on ad_campaigns for insert
  with check (auth.uid() = advertiser_id and status = 'pending_payment');

-- Deliberately no update policy for the advertiser at all. Payment
-- confirmation (pending_payment -> pending_review) happens in the
-- Stripe webhook via the service role, which bypasses RLS entirely;
-- approval (pending_review -> active/rejected) happens through the
-- admin-only policy below. There is no path for an advertiser's own
-- session to move their campaign's status at all.
create policy "admins update any campaign"
  on ad_campaigns for update
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create index ad_campaigns_advertiser_id_idx on ad_campaigns (advertiser_id);
create index ad_campaigns_status_idx on ad_campaigns (status);

-- Impressions/clicks, append-only (same pattern as post_views) so real
-- counts are always a query away, never a denormalized counter an
-- advertiser could be shown a stale or gamed number from.
create table ad_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references ad_campaigns (id) on delete cascade,
  kind text not null check (kind in ('impression', 'click')),
  viewer_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table ad_events enable row level security;

create policy "advertisers read their own campaign events"
  on ad_events for select
  using (
    exists (
      select 1 from ad_campaigns
      where ad_campaigns.id = ad_events.campaign_id
      and ad_campaigns.advertiser_id = auth.uid()
    )
  );

-- Same anti-abuse posture as post_views: only a real logged-in viewer's
-- own impressions/clicks get recorded at all (auth.uid() = viewer_id,
-- not just "any row claiming to be about an active campaign") — an
-- advertiser is paying real money for these numbers, so anonymous or
-- spoofed-viewer inserts aren't something to allow here either.
create policy "log events on active campaigns"
  on ad_events for insert
  with check (
    auth.uid() = viewer_id
    and exists (
      select 1 from ad_campaigns
      where ad_campaigns.id = ad_events.campaign_id
      and ad_campaigns.status = 'active'
    )
  );

create index ad_events_campaign_id_idx on ad_events (campaign_id);
