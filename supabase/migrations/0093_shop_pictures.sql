-- A shop's profile picture, added by someone who has paid to promote it.
-- Shops come from Google, not a SORZA account (see 0045), so "has ever
-- paid to promote this place" is the only connection to a shop this app
-- can prove — the same gate get_shop_analytics_counts uses (0056). A
-- shop_promotions row stays 'active' after its ends_at passes, so that
-- right, and the picture itself, outlive the promotion: nothing here
-- reads ends_at.
--
-- One picture per place, owned by whoever added it first. Only they can
-- change it afterwards, so someone else promoting the same shop later
-- can't pay to replace it. A verified business's own logo
-- (business_profiles.logo_media_id) still shows instead of this when it
-- has one — that's the real owner's override.
create table shop_pictures (
  place_id text primary key,
  owner_id uuid not null references profiles (id) on delete cascade,
  media_id uuid not null references media (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table shop_pictures enable row level security;

create policy "shop pictures are publicly readable"
  on shop_pictures for select
  using (true);

-- Only a past paying promoter, only with their own photo, and only for a
-- shop with no picture yet (the primary key turns a second one away).
create policy "promoters add a picture to a shop they promoted"
  on shop_pictures for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from shop_promotions p
      where p.place_id = shop_pictures.place_id
        and p.promoter_id = auth.uid()
        and p.status = 'active'
    )
    and exists (
      select 1 from media m
      where m.id = shop_pictures.media_id and m.owner_id = auth.uid()
    )
  );

create policy "picture owners change their own shop picture"
  on shop_pictures for update
  using (auth.uid() = owner_id)
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from shop_promotions p
      where p.place_id = shop_pictures.place_id
        and p.promoter_id = auth.uid()
        and p.status = 'active'
    )
    and exists (
      select 1 from media m
      where m.id = shop_pictures.media_id and m.owner_id = auth.uid()
    )
  );

create policy "picture owners and admins remove a shop picture"
  on shop_pictures for delete
  using (
    auth.uid() = owner_id
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- The picture chosen in the promote form, before paying. The Stripe
-- webhook (service role) copies it into shop_pictures once payment
-- clears — a draft can't add a picture by itself, since the insert
-- policy above needs a paid promotion.
alter table shop_promotions
  add column picture_media_id uuid references media (id) on delete set null;
