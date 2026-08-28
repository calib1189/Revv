-- Adds a third "Diamond" shop promotion tier, on top of the existing
-- 'standard' (Silver) and 'featured' (Gold) — matches ad campaigns'
-- three-tier depth. Postgres has no "add an allowed value" for an
-- inline check constraint, so this drops and recreates it rather than
-- altering it in place.

alter table shop_promotions drop constraint shop_promotions_tier_check;
alter table shop_promotions add constraint shop_promotions_tier_check
  check (tier in ('standard', 'featured', 'diamond'));
