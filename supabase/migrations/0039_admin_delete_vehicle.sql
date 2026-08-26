-- Vehicle reports (reports.target_type = 'vehicle', already supported by
-- the reports table since 0001) had no way for an admin to actually
-- remove the reported vehicle — "owners manage their own vehicles" (0001)
-- only lets the owner touch their own row, and RLS doesn't automatically
-- carve out an exception for a different, unrelated table's is_admin
-- flag. Same gap 0012_protect_is_admin_column.sql documented for a
-- different reason, same fix pattern as 0008_admin.sql's "admins delete
-- any post"/"admins delete any comment".
create policy "admins delete any vehicle"
  on vehicles for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
