-- 0001 deliberately left `parts` with no insert/update/delete policy —
-- catalog writes went through the service role only, with no admin UI to
-- do it any other way. That's the actual reason the /parts catalog has
-- stayed empty: nobody has ever had a way to add a real part short of
-- hand-writing SQL. This adds admin-only write access, same pattern as
-- the admin policies already added for reports/posts/comments in 0008
-- (an additional permissive policy, not a replacement of the public
-- read policy from 0001 — Postgres ORs them together).
create policy "admins insert parts"
  on parts for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admins update parts"
  on parts for update
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admins delete parts"
  on parts for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
