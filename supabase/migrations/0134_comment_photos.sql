-- Photos in comments. Run after 0133.
--
-- A comment is now one of: text; a GIF on its own (0130); or a photo with
-- an optional caption. The photo is an ordinary media row the commenter
-- uploaded (screened by the same image check as posts before it reaches
-- storage), referenced here by id. If the media row goes, the comment's
-- photo goes with it rather than the comment.
--
-- No new policy: comments' existing RLS (author only, blocks, bans, rate
-- limits) covers the column. A trigger makes sure the photo is the
-- commenter's own, so nobody can attach someone else's upload.
--
-- Until this runs, the app's photo button fails with a clear error and
-- text and GIF comments carry on as before.

alter table comments
  add column media_id uuid references media (id) on delete set null;

alter table comments drop constraint if exists comments_body_or_gif;
alter table comments add constraint comments_content check (
  -- a GIF stands alone
  (gif_id is not null and body = '' and media_id is null)
  -- text, or a photo with an optional caption
  or (gif_id is null and media_id is null and char_length(body) between 1 and 2000)
  or (gif_id is null and media_id is not null and char_length(body) <= 2000)
);

create or replace function comments_media_is_authors()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.media_id is not null and not exists (
    select 1 from media m where m.id = new.media_id and m.owner_id = new.author_id and m.kind = 'image'
  ) then
    raise exception 'A comment photo must be an image you uploaded.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_media_is_authors on comments;
create trigger comments_media_is_authors
  before insert or update of media_id on comments
  for each row execute function comments_media_is_authors();
