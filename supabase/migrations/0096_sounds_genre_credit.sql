-- Genres to browse the Sounds library by, and where a licensed track came
-- from. Creative Commons tracks must credit their source, so a licensed
-- sound keeps a link back to the page it was published on (license_url
-- already holds the license itself, from 0083_sounds.sql).
--
-- The genre list mirrors src/lib/sounds/genres.ts (a test keeps the two in
-- step). Null is fine: older sounds and uploads without a genre still show
-- under "All" and in search.
alter table sounds
  add column genre text check (genre is null or genre in ('phonk', 'hiphop', 'electronic', 'synthwave', 'rock', 'cinematic', 'chill')),
  add column source_url text check (source_url is null or source_url ~ '^https://');

create index sounds_genre_idx on sounds (genre, created_at desc) where genre is not null;
