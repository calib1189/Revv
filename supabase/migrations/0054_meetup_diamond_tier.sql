-- Adds a third "Diamond" meetup tier, matching shop promotions' three-tier
-- depth (0051). Postgres has no "add an allowed value" for an inline check
-- constraint, so this drops and recreates it rather than altering it in
-- place — same approach as 0051_shop_promotion_diamond_tier.sql.

alter table meetups drop constraint meetups_tier_check;
alter table meetups add constraint meetups_tier_check
  check (tier in ('standard', 'promoted', 'diamond'));
