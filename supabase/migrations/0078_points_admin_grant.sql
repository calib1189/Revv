-- Adds a fourth points_ledger source_type for one-off admin/founder
-- grants — distinct from the normal earn ('achievement', 'challenge')
-- and spend ('purchase') paths so the ledger stays an honest record of
-- why each row exists, rather than mislabeling a manual grant as an
-- achievement payout.
alter table points_ledger drop constraint if exists points_ledger_source_type_check;
alter table points_ledger add constraint points_ledger_source_type_check
  check (source_type in ('achievement', 'challenge', 'purchase', 'admin_grant'));

-- Effectively-unlimited balance for the founder account. A single large
-- ledger row, not a special-cased "unlimited" flag — the balance is
-- still just sum(amount), same as everyone else's.
insert into points_ledger (user_id, amount, source_type, source_id)
select id, 999999999, 'admin_grant', 'founder_unlimited'
from profiles
where username = 'calib_lawson'
on conflict (user_id, source_type, source_id) do nothing;
