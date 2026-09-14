-- Same nullable-FK-tag idiom as posts.crew_id (0065_crew_content_links.sql)
-- — a post optionally carries one attached sound, purely additive, never a
-- partition of the feed.
alter table posts add column sound_id uuid references sounds (id) on delete set null;
create index posts_sound_id_idx on posts (sound_id) where sound_id is not null;
