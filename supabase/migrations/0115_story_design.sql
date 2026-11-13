-- The story editor's layers (text, drawing, stickers, filter, how the
-- media sits in the frame), saved as JSON on the story rather than
-- burned into the photo or video. Validated and size-capped by the
-- server before it's written (lib/stories/design.ts); the check here is
-- a backstop on size. Null for stories posted before the editor.
alter table stories add column design jsonb
  check (design is null or pg_column_size(design) < 262144);
