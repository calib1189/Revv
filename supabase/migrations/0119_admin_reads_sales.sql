-- Admin → Sales lists every real-money purchase. Ads (0042) and meets
-- (0057) already let admins read every row; these add the same for the
-- rest of what's sold. Read-only, and added to (never replacing) each
-- table's own owner policies, since permissive policies OR together.

create policy "admins read all points purchases"
  on points_purchases for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "admins read all decal orders"
  on decal_orders for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "admins read all poster orders"
  on poster_orders for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "admins read all tee orders"
  on tee_orders for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "admins read all shop promotions"
  on shop_promotions for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
