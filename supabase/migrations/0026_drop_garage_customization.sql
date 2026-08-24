-- The customizable garage backdrop/diorama feature (0024, 0025) is
-- removed — it didn't look right after two visual passes and was scrapped
-- rather than iterated on further. Dropping the columns that only existed
-- to support it.

alter table profiles
  drop column garage_theme,
  drop column garage_layout;

alter table vehicles
  drop column garage_cutout_media_id;
