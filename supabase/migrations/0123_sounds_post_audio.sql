-- A video posted with its own audio (no library sound) now turns that
-- audio into a sound of its own, "Original sound · username", so other
-- members can make videos with it, TikTok-style. 'post_audio' marks those
-- rows: browsing keeps them out of Trending until someone else has used
-- one, since otherwise every video posted would add a sound there.
--
-- The check is the inline one from 0083_sounds.sql, which Postgres named
-- sounds_source_check.
alter table sounds drop constraint sounds_source_check;
alter table sounds
  add constraint sounds_source_check
  check (source in ('original', 'licensed', 'user_upload', 'post_audio'));

create index sounds_post_audio_idx on sounds (created_at desc) where source = 'post_audio';
