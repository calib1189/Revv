-- REVV V17: let admins read analytics events (previously service-role
-- only). Aggregates are still always computed at query time — this adds
-- no stored counters.

create policy "admins read events"
  on events for select
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
