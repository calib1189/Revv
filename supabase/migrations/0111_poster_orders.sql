-- Printed build posters: the owner's car photo with its SORZA score,
-- rank and category scores, printed and shipped by Printful
-- (lib/posters/products.ts). Same flow as rank decals (0110): an order
-- row is written before checkout, Stripe's webhook marks it paid, and
-- the server renders the print file and sends it to Printful.

create table poster_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  vehicle_id uuid references vehicles (id) on delete set null,
  product text not null check (product in ('poster_18x24', 'framed_12x18')),
  -- Everything printed on the poster (car, owner, score, rank, category
  -- scores, rating date, cover photo path), fixed when the order is
  -- placed so the print shows the rating that was bought.
  snapshot jsonb not null,
  status text not null default 'awaiting_payment' check (
    status in ('awaiting_payment', 'paid', 'sent_to_printer', 'failed', 'canceled')
  ),
  amount_cents integer not null check (amount_cents >= 0),
  stripe_session_id text unique,
  -- The rendered print file in the poster-prints bucket.
  print_file_path text,
  printer_order_id text,
  -- Why rendering or sending to the printer failed, for an admin to follow up on.
  error text check (error is null or char_length(error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table poster_orders enable row level security;

create policy "users read their own poster orders"
  on poster_orders for select
  using (auth.uid() = user_id);

create index poster_orders_user_idx on poster_orders (user_id, created_at desc);

-- The rendered print files. Private: no policies, so only the server
-- (service role) can read or write them; Printful gets a signed link.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('poster-prints', 'poster-prints', false, 52428800, array['image/png'])
on conflict (id) do nothing;
