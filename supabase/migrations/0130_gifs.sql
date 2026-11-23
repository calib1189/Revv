-- GIFs in DMs and comments.
--
-- A GIF is stored as its GIPHY id plus the size of the rendition we show,
-- never as a URL: the image address is built from the id
-- (media.giphy.com/media/<id>/200w.webp, see lib/gifs.ts), so a row can't
-- point at an arbitrary image host. A GIF is sent on its own, the way
-- Instagram and iMessage do it, so a GIF row has an empty body.
--
-- No new table: the existing messages/comments RLS policies (participants
-- only, blocks, bans, rate limits) already cover these columns.

alter table messages
  add column gif_id text,
  add column gif_width int,
  add column gif_height int;

alter table comments
  add column gif_id text,
  add column gif_width int,
  add column gif_height int;

-- The original body length checks (0001, 0006) require 1+ characters;
-- drop them by definition rather than by guessed name.
do $$
declare
  c record;
begin
  for c in
    select conname, conrelid::regclass as tbl
    from pg_constraint
    where contype = 'c'
      and conrelid in ('messages'::regclass, 'comments'::regclass)
      and pg_get_constraintdef(oid) like '%char_length(body)%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

alter table messages add constraint messages_body_or_gif check (
  (gif_id is null and char_length(body) between 1 and 4000)
  or (gif_id is not null and body = '')
);

alter table messages add constraint messages_gif_shape check (
  gif_id is null
  or (
    gif_id ~ '^[A-Za-z0-9]{1,64}$'
    and gif_width between 1 and 2000
    and gif_height between 1 and 2000
  )
);

alter table comments add constraint comments_body_or_gif check (
  (gif_id is null and char_length(body) between 1 and 2000)
  or (gif_id is not null and body = '')
);

alter table comments add constraint comments_gif_shape check (
  gif_id is null
  or (
    gif_id ~ '^[A-Za-z0-9]{1,64}$'
    and gif_width between 1 and 2000
    and gif_height between 1 and 2000
  )
);
