-- Where in an attached sound playback starts — the "which part of the
-- song" TikTok-style trim point. Lives on posts, not sounds: the same
-- shared sound can be trimmed differently by every post that uses it
-- (sounds.duration_ms is the sound's own total length; this is just an
-- offset into it, clamped client- and server-side by clampSoundStartMs
-- in lib/validation/sound.ts so a clip never runs past the sound's end).
-- Defaults to 0 (the start of the sound) for every existing post.
alter table posts add column sound_start_ms int not null default 0 check (sound_start_ms >= 0);
