-- ATVs & UTVs: quads and side-by-sides get a category (and a leaderboard)
-- of their own. They were landing in Trucks & Off-road, where the AI
-- rating judged them as trucks and marked them down for having no cab or
-- bed. Mirrors VEHICLE_CATEGORIES in src/lib/vehicles/category.ts. Until
-- this runs, saving a vehicle as ATVs & UTVs fails the check; nothing
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
    'atv_utv',
    'cars'
  ));
