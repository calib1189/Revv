-- Lets a build's owner attach one photo to an individual modification —
-- same "single FK to media" pattern as vehicles.hero_media_id, not a
-- junction table, since this is one photo per mod, not a gallery. No RLS
-- changes needed: build_parts' existing "owners manage build_parts on
-- their own builds" policy (0001_init.sql) already covers every column,
-- this one included.

alter table build_parts
  add column media_id uuid references media (id) on delete set null;
