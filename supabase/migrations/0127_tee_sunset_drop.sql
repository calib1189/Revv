-- The Limited Vice City Tee (design id 'sunset'): a limited drop, sold in
-- black, white and sky until the end date in src/lib/merch/products.ts.
--
-- 1. Orders store the design id, so the design check has to know the new
--    one. The colour is the Printful variant already saved on the order
--    (sky's are 14981-14986), so nothing else about orders changes.
alter table tee_orders drop constraint tee_orders_design_check;
alter table tee_orders add constraint tee_orders_design_check
  check (design in ('big-s', 'built-rated-ranked', 'wordmark', 'sunset'));

-- 2. "It just dropped": one push per person per drop from the hourly job
--    (0107), logged in daily_push_log under the drop's end date like the
--    other afternoon pushes (0126), so overlapping runs can't send it
--    twice. Until this runs, the insert fails the kind check and the push
--    is never sent; nothing else is affected.
alter table daily_push_log drop constraint if exists daily_push_log_kind_check;
alter table daily_push_log add constraint daily_push_log_kind_check
  check (kind in ('morning', 'evening', 'vote', 'rank', 'add_car', 'rate_car', 'drop'));
