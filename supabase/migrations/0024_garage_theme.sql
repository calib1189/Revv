-- Lets a user pick a backdrop for their own /garage page. Purely
-- cosmetic (CSS-driven, no image assets), so a free-text column with an
-- app-level allowlist is enough — no need for a Postgres enum that a new
-- theme would require a migration to extend.

alter table profiles
  add column garage_theme text not null default 'workshop';
