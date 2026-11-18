-- Referral rewards: when someone who was invited (a referrals row) adds
-- their first car, the inviter and the invitee each get 50 points.
-- Written only by the server (service role, as every points_ledger write
-- has been since 0081), once per pair: the ledger's own
-- unique(user_id, source_type, source_id) keeps a re-run from paying twice.
-- source_id is the invitee's id for both rows.
alter table points_ledger drop constraint if exists points_ledger_source_type_check;
alter table points_ledger add constraint points_ledger_source_type_check
  check (source_type in ('achievement', 'challenge', 'purchase', 'admin_grant', 'daily', 'points_pack', 'points_refund', 'instant_rerate', 'referral'));
