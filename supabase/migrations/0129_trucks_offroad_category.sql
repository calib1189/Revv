-- Trucks & Off-road: pickups and built 4x4s get a category (and a
-- leaderboard) of their own instead of landing in Regular Traffic.
-- Mirrors VEHICLE_CATEGORIES in src/lib/vehicles/category.ts. Until this
-- runs, saving a vehicle as Trucks & Off-road fails the check; nothing
-- else is affected.
alter table vehicles drop constraint if exists vehicles_category_check;
alter table vehicles add constraint vehicles_category_check
  check (category in (
    'street_bikes',
    'cruisers_choppers',
    'classics',
    'supercars',
    'jdm',
    'muscle_pony',
    'euro_performance',
    'track_race',
    'trucks_offroad',
    'cars'
  ));
