-- Lets a vehicle be grouped into a build category for leaderboard
-- splitting (a Cadillac ATS and a Supra shouldn't have to compete on the
-- same leaderboard). Free-text column with an app-level allowlist
-- (src/lib/vehicles/category.ts is the single source of truth for the
-- values, mirrored here as a check constraint so bad values can't land
-- in the database even if the app-level list and this constraint ever
-- drift) rather than a Postgres enum, which would need a migration every
-- time a category is added or renamed.

alter table vehicles
  add column category text not null default 'cars'
    check (category in (
      'street_bikes',
      'cruisers_choppers',
      'classics',
      'supercars',
      'jdm',
      'muscle_pony',
      'euro_performance',
      'track_race',
      'cars'
    ));
