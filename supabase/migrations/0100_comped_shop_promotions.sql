-- Lets an admin promote a shop for free ("comp" it) — e.g. to give an
-- early shop owner top placement while the app is still small. A comped
-- promotion is an ordinary active shop_promotions row (same tier, same
-- category, same ends_at), so every place that sorts, badges or injects
-- promoted shops treats it exactly like a paid one. The only differences
-- are price_cents = 0 and comped_by, which says which admin granted it.
--
-- Paid promotions still only ever become active through the Stripe
-- webhook (0045): this policy is admin-only and only accepts a free,
-- already-active row stamped with the admin's own id.

alter table shop_promotions
  add column comped_by uuid references profiles (id) on delete set null;

create policy "admins comp shop promotions"
  on shop_promotions for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    and status = 'active'
    and price_cents = 0
    and comped_by = auth.uid()
    and promoter_id = auth.uid()
    and starts_at is not null
    and ends_at is not null
  );

-- Ending a comp early just moves its ends_at to now. Admin-only, and only
-- for comped rows: a paid promotion's dates are never touched from here.
create policy "admins end comped shop promotions"
  on shop_promotions for update
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    and comped_by is not null
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    and comped_by is not null
  );
