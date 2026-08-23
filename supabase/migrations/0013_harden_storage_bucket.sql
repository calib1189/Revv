-- Storage hardening: the 'media' bucket (0002) has never had a size limit
-- or mime-type allowlist at the storage layer — only the client's <input
-- accept="..."> attribute, which is trivial to bypass with a direct API
-- call. Anyone with an account could currently upload arbitrary file
-- types (executables, scripts) of arbitrary size to public storage.
--
-- This restricts the bucket to the exact mime types the app's uploaders
-- already send (see compose-post-form.tsx, gallery-uploader.tsx,
-- cover-photo-uploader.tsx, visualizer-form.tsx, ai-identify-panel.tsx)
-- and caps individual file size at 200MB — generous enough for a short
-- vertical video, tight enough to bound storage/bandwidth abuse. This is
-- a bucket-wide ceiling (Supabase Storage doesn't support per-mime-type
-- limits), so it doesn't stop someone uploading a 200MB "photo" — a
-- finer per-type check would need a Storage Edge Function, which is a
-- reasonable follow-up but out of scope here.

update storage.buckets
set
  file_size_limit = 209715200, -- 200MB
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
where id = 'media';
