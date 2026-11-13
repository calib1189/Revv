-- SORZA tees: three designs on the Gildan 5000, printed front and back
-- and shipped by Printful (lib/merch/products.ts). Same flow as rank
-- decals (0110) and posters (0111): an order row is written before
-- checkout, Stripe's webhook marks it paid, and the server sends it to
-- Printful. The print files are fixed per design (public/merch/print),
-- so nothing is rendered per order.

create table tee_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  design text not null check (design in ('big-s', 'built-rated-ranked', 'wordmark')),
  size text not null check (size in ('S', 'M', 'L', 'XL', '2XL', '3XL')),
  -- The Printful catalog variant (design color + size), fixed at order time.
  variant_id integer not null,
  status text not null default 'awaiting_payment' check (
    status in ('awaiting_payment', 'paid', 'sent_to_printer', 'failed', 'canceled')
  ),
  amount_cents integer not null check (amount_cents >= 0),
  stripe_session_id text unique,
  printer_order_id text,
  -- Why sending to the printer failed, for an admin to follow up on.
  error text check (error is null or char_length(error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tee_orders enable row level security;

-- Buyers read their own orders; every write goes through the server
-- (service role), so there are no insert or update policies.
create policy "users read their own tee orders"
  on tee_orders for select
  using (auth.uid() = user_id);

create index tee_orders_user_idx on tee_orders (user_id, created_at desc);
