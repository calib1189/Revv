-- A smaller, cheaper poster: 12x16 in. matte (lib/posters/products.ts).
-- Same 3:4 shape as the 18x24, so it prints the identical layout.
alter table poster_orders drop constraint poster_orders_product_check;
alter table poster_orders add constraint poster_orders_product_check
  check (product in ('poster_12x16', 'poster_18x24', 'framed_12x18'));
