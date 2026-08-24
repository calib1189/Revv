-- Real garage customization: which car sits in which bay, what decor
-- surrounds them, and (via vehicles.garage_cutout_media_id) a background-
-- removed cutout of the car so it reads as sitting in the scene instead of
-- a rectangular photo pasted over it.

alter table vehicles
  add column garage_cutout_media_id uuid references media(id) on delete set null;

alter table profiles
  add column garage_layout jsonb not null default '{}'::jsonb;
