-- Lets a user pin up to 3 unlocked achievements to display directly on
-- their profile header — the "flex" surface, visible to any visitor
-- without clicking into the Achievements tab. Order in the array is
-- display order. Achievement ids are the catalog's own string ids
-- (lib/achievements/catalog.ts), not a foreign key — the catalog is a
-- fixed, code-defined list, not a database table.
alter table profiles
  add column showcased_achievement_ids text[] not null default '{}'
  check (array_length(showcased_achievement_ids, 1) is null or array_length(showcased_achievement_ids, 1) <= 3);
