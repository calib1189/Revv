-- Tracks whether a user has been through the /welcome flow. Null means
-- "never seen it" — the auth callback and sign-in action both check this
-- to decide whether to route a fresh session to /welcome instead of
-- straight into the app.

alter table profiles
  add column onboarded_at timestamptz;
