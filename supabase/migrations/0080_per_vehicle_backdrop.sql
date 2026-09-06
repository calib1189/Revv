-- Garage Backdrop moves from an account-wide setting (one backdrop for
-- the whole garage) to a per-vehicle one — each car can carry its own
-- backdrop (or share the same one), matching how a Nameplate Color or
-- showcase frame is a purchased look applied to one specific thing,
-- not the whole account. RLS already covers this: "owners manage their
-- own vehicles" (0001_init.sql) is a for-all policy, so it already
-- allows the owner to update this new column the same as any other
-- vehicle field.
alter table vehicles add column equipped_backdrop text;

-- The account-wide slot it replaces. Nameplate Color is unaffected —
-- that one's staying account-wide.
alter table profiles drop column equipped_garage_backdrop;
