-- REVV V16: admin role, moderation of reports, audit log.
--
-- There is no self-service way to become an admin, by design — after
-- running this migration, promote yourself (or whoever should moderate)
-- manually:
--   update profiles set is_admin = true where username = 'your_username';

alter table profiles add column is_admin boolean not null default false;

-- ---------------------------------------------------------------------
-- audit_logs: every moderation action gets recorded here.
-- ---------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table audit_logs enable row level security;

create policy "admins read audit logs"
  on audit_logs for select
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admins write audit logs"
  on audit_logs for insert
  with check (
    actor_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- ---------------------------------------------------------------------
-- Extend existing tables' RLS with admin-only policies. Postgres ORs
-- multiple permissive policies for the same command together, so these
-- add to (never replace) the owner-only policies from 0001.
-- ---------------------------------------------------------------------
create policy "admins read all reports"
  on reports for select
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admins update reports"
  on reports for update
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admins delete any post"
  on posts for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admins delete any comment"
  on comments for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
