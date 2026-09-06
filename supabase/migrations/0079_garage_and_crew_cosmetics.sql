-- Garage cosmetics equip onto the same account-wide slot pattern as
-- profile cosmetics (profiles.equipped_*) — one nameplate color and
-- one garage backdrop per account, applied everywhere that account's
-- vehicles are shown.
alter table profiles
  add column equipped_vehicle_name_color text,
  add column equipped_garage_backdrop text;

-- Crew cosmetics equip onto the crew itself (shared, not per-viewer) —
-- purchased with the owner's own points (store_items_owned stays
-- user-scoped) but visible to everyone who views the crew. No new RLS
-- needed: "owners manage their own crews" (0064_crews.sql) already
-- covers UPDATE on these new columns the same as any other crew field.
alter table crews
  add column equipped_crew_name_color text,
  add column equipped_crew_banner text,
  add column equipped_crew_frame text;
