-- Shop promotion moves from one flat price to two real tiers: 'standard'
-- ($25) sorts ahead of un-promoted shops same as before, 'featured' ($50)
-- sorts ahead of standard-promoted ones too — a real "guaranteed top
-- spot" option, not just "ahead of the pack". Same tier-lookup pattern
-- already used for ad campaigns and meetups (price looked up server-side
-- by tier name, never trusted from the client).

alter table shop_promotions
  add column tier text not null default 'standard' check (tier in ('standard', 'featured'));

create index shop_promotions_tier_idx on shop_promotions (tier);
