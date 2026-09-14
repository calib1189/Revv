-- The 'media' bucket's mime-type allowlist (0013_harden_storage_bucket.sql)
-- predates the Sounds feature and only ever included image/video types —
-- every sound upload (the seed script, and any member's own upload) was
-- being rejected at the storage layer with "mime type audio/wav is not
-- supported". Adds exactly the audio types validateAudioFile
-- (src/lib/validation/media.ts) already accepts client-side, so the two
-- checks agree.
update storage.buckets
set
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/mp4',
    'audio/aac',
    'audio/wav',
    'audio/x-wav'
  ]
where id = 'media';
