-- Separate display name from the immutable, URL-safe username. Nullable —
-- falls back to "@username" as the primary heading when unset. No RLS
-- change needed: the existing "users update their own profile" policy
-- from 0001 already covers new columns on the same row.

alter table profiles
  add column display_name text check (display_name is null or char_length(display_name) <= 50);
