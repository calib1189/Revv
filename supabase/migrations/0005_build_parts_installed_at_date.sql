-- installed_at was declared timestamptz in 0001 but is only ever used as a
-- date (form input type="date", displayed without a time). date matches
-- maintenance.performed_at's type and intent.
alter table build_parts
  alter column installed_at type date using installed_at::date;
