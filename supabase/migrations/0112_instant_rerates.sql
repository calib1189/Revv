-- Instant re-rates: an owner can skip the 24-hour wait between ratings of
-- a car by spending points. Each one is a negative points_ledger row with
-- source_type 'instant_rerate', written only by the server (service role,
-- as every ledger write is since 0081), and removed again if the rating
-- itself fails. Run after 0110.

alter table points_ledger drop constraint if exists points_ledger_source_type_check;
alter table points_ledger add constraint points_ledger_source_type_check
  check (source_type in ('achievement', 'challenge', 'purchase', 'admin_grant', 'daily', 'points_pack', 'points_refund', 'instant_rerate'));
