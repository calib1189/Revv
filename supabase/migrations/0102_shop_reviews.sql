-- SORZA's own shop reviews: someone who's been to a shop rates it 1-5,
-- says what they got done and which of their cars it was, and writes a
-- few words. The reviewers double as the shop's "been here" list. The
-- shop's verified owner can reply once per review.
--
-- One review per person per shop (they edit it rather than stacking
-- more). The average and count are computed when the page is read,
-- never stored.

create table shop_reviews (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  author_id uuid not null references profiles (id) on delete cascade,
  vehicle_id uuid references vehicles (id) on delete set null,
  rating int not null check (rating between 1 and 5),
  service text check (service is null or char_length(service) between 1 and 40),
  body text check (body is null or char_length(body) <= 1000),
  owner_reply text check (owner_reply is null or char_length(owner_reply) <= 1000),
  owner_replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, author_id)
);

create index shop_reviews_place_id_idx on shop_reviews (place_id, created_at desc);
create index shop_reviews_author_id_idx on shop_reviews (author_id);

alter table shop_reviews enable row level security;

-- Whether the signed-in user is this shop's verified owner.
create or replace function public.is_verified_shop_owner(p_place_id text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from business_profiles
    where place_id = p_place_id
      and owner_id = auth.uid()
      and verification_status = 'approved'
  );
$$;

revoke all on function public.is_verified_shop_owner(text) from public;
grant execute on function public.is_verified_shop_owner(text) to authenticated;

create policy "shop reviews are publicly readable"
  on shop_reviews for select
  using (true);

-- Your own review, with your own car, not of your own shop, and not
-- while banned (0055). Replies can't be written on insert.
create policy "users review shops"
  on shop_reviews for insert
  with check (
    auth.uid() = author_id
    and not exists (select 1 from profiles where id = auth.uid() and is_banned)
    and not public.is_verified_shop_owner(place_id)
    and owner_reply is null
    and owner_replied_at is null
    and (
      vehicle_id is null
      or exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = auth.uid())
    )
  );

-- The author edits their review; the shop's verified owner writes the
-- reply. The trigger below keeps each to their own columns.
create policy "authors and shop owners update reviews"
  on shop_reviews for update
  using (auth.uid() = author_id or public.is_verified_shop_owner(place_id))
  with check (
    (auth.uid() = author_id or public.is_verified_shop_owner(place_id))
    and (
      vehicle_id is null
      or exists (select 1 from vehicles v where v.id = vehicle_id and v.owner_id = author_id)
    )
  );

create policy "authors delete their reviews"
  on shop_reviews for delete
  using (auth.uid() = author_id);

create policy "admins delete any review"
  on shop_reviews for delete
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create or replace function public.protect_shop_review_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_is_owner boolean;
begin
  new.place_id := old.place_id;
  new.author_id := old.author_id;
  new.created_at := old.created_at;

  if auth.role() = 'authenticated' then
    caller_is_owner := public.is_verified_shop_owner(old.place_id);

    -- Only the shop's owner touches the reply.
    if not caller_is_owner then
      new.owner_reply := old.owner_reply;
      new.owner_replied_at := old.owner_replied_at;
    elsif new.owner_reply is distinct from old.owner_reply then
      new.owner_replied_at := case when new.owner_reply is null then null else now() end;
    end if;

    -- Only the author touches the review itself.
    if auth.uid() is distinct from old.author_id then
      new.rating := old.rating;
      new.service := old.service;
      new.body := old.body;
      new.vehicle_id := old.vehicle_id;
      new.updated_at := old.updated_at;
    elsif (new.rating, new.service, new.body, new.vehicle_id)
        is distinct from (old.rating, old.service, old.body, old.vehicle_id) then
      new.updated_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_shop_review_columns
  before update on shop_reviews for each row execute function public.protect_shop_review_columns();

-- Tell the shop's verified owner about a new review, in Activity.
create or replace function public.handle_new_shop_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  shop_owner uuid;
begin
  select owner_id into shop_owner from public.business_profiles
  where place_id = new.place_id and verification_status = 'approved'
  limit 1;
  if shop_owner is null or shop_owner = new.author_id then
    return new;
  end if;

  insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
  values (shop_owner, 'shop_review', new.author_id, 'shop_review', new.id);
  return new;
end;
$$;

create trigger on_shop_review_insert
  after insert on shop_reviews for each row execute function public.handle_new_shop_review();

-- Reviews can be reported like posts and comments.
alter table reports drop constraint reports_target_type_check;
alter table reports add constraint reports_target_type_check
  check (target_type in ('post', 'comment', 'profile', 'vehicle', 'shop_review'));
