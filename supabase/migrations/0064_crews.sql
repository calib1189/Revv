-- Crews: communities around a make/model, local area, scene, car club, or
-- private friend group. A crew has exactly one immutable owner (owner_id,
-- set at creation — no ownership-transfer flow in v1) plus a crew_members
-- roster tracking role (member/admin/leader) and status (pending/approved).
-- This is the first role-per-row membership table in this schema —
-- follows is a plain unique pair with neither role nor status.

create table crews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  description text check (description is null or char_length(description) <= 1000),
  category text not null check (category in (
    'make_model', 'local_area', 'scene', 'club', 'private_group', 'other'
  )),
  location_text text check (location_text is null or char_length(location_text) <= 200),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  logo_media_id uuid references media (id) on delete set null,
  banner_media_id uuid references media (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table crews enable row level security;

-- ---------------------------------------------------------------------
-- crew_members (created before crews' own policies below, since two of
-- them reference it)
-- ---------------------------------------------------------------------
create table crew_members (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crews (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin', 'leader')),
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now(),
  unique (crew_id, user_id)
);

alter table crew_members enable row level security;

create index crew_members_user_id_idx on crew_members (user_id);

-- ---------------------------------------------------------------------
-- crews policies
-- ---------------------------------------------------------------------
create policy "public crews are readable by everyone"
  on crews for select
  using (visibility = 'public');

create policy "private crews are readable by the owner and approved members"
  on crews for select
  using (
    visibility = 'private'
    and (
      auth.uid() = owner_id
      or exists (
        select 1 from crew_members
        where crew_members.crew_id = crews.id
          and crew_members.user_id = auth.uid()
          and crew_members.status = 'approved'
      )
    )
  );

create policy "owners manage their own crews"
  on crews for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------------
-- crew_members policies
-- ---------------------------------------------------------------------

-- select: four permissive policies, OR'd together by Postgres.
create policy "approved crew_members of public crews are publicly readable"
  on crew_members for select
  using (
    status = 'approved'
    and exists (
      select 1 from crews
      where crews.id = crew_members.crew_id
        and crews.visibility = 'public'
    )
  );

create policy "users see their own crew_members row"
  on crew_members for select
  using (auth.uid() = user_id);

create policy "approved members see the full approved roster of their crew"
  on crew_members for select
  using (
    status = 'approved'
    and exists (
      select 1 from crew_members as viewer
      where viewer.crew_id = crew_members.crew_id
        and viewer.user_id = auth.uid()
        and viewer.status = 'approved'
    )
  );

create policy "crew leaders and admins see every row in their crew, including pending"
  on crew_members for select
  using (
    exists (
      select 1 from crew_members as acting
      where acting.crew_id = crew_members.crew_id
        and acting.user_id = auth.uid()
        and acting.status = 'approved'
        and acting.role in ('leader', 'admin')
    )
  );

-- insert: a user may only ever insert THEIR OWN row, always as role =
-- 'member' (never self-assigning leader/admin), and status must match the
-- crew's visibility — 'approved' only for a public crew (instant join),
-- 'pending' only for a private crew (request-to-join, cannot self-approve).
-- The crew creator's own leader row bypasses this policy entirely — see
-- handle_new_crew() below, which runs security definer.
create policy "users self-join public crews or self-request private crews"
  on crew_members for insert
  with check (
    auth.uid() = user_id
    and role = 'member'
    and (
      (
        status = 'approved'
        and exists (select 1 from crews where crews.id = crew_members.crew_id and crews.visibility = 'public')
      )
      or (
        status = 'pending'
        and exists (select 1 from crews where crews.id = crew_members.crew_id and crews.visibility = 'private')
      )
    )
  );

-- update: only an approved leader/admin of THIS crew may update ANY row in
-- it (approve a pending request by flipping status, promote/demote a
-- role). Deliberately no self-service update policy exists — a member can
-- only ever INSERT (above) or DELETE (below) their own row, never UPDATE
-- it, so there's no column-granularity gotcha to guard against here the
-- way profiles.is_admin needed a trigger (0012_protect_is_admin_column.sql).
create policy "crew leaders and admins manage other members' role and status"
  on crew_members for update
  using (
    exists (
      select 1 from crew_members as acting
      where acting.crew_id = crew_members.crew_id
        and acting.user_id = auth.uid()
        and acting.status = 'approved'
        and acting.role in ('leader', 'admin')
    )
  )
  with check (
    exists (
      select 1 from crew_members as acting
      where acting.crew_id = crew_members.crew_id
        and acting.user_id = auth.uid()
        and acting.status = 'approved'
        and acting.role in ('leader', 'admin')
    )
  );

-- delete: a user may always delete their own row (leave the crew, or
-- cancel their own pending request — same operation either way); a
-- leader/admin may delete anyone else's row in their crew (kick, or
-- reject a pending request).
create policy "members leave their own row, leaders and admins remove others"
  on crew_members for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from crew_members as acting
      where acting.crew_id = crew_members.crew_id
        and acting.user_id = auth.uid()
        and acting.status = 'approved'
        and acting.role in ('leader', 'admin')
    )
  );

-- ---------------------------------------------------------------------
-- Crew creator becomes leader automatically, atomically with creation —
-- mirrors handle_new_user() in 0001_init.sql. security definer bypasses
-- the insert policy above entirely (that policy only allows self-inserts
-- as role = 'member'), so a crew can never exist with zero leaders.
-- ---------------------------------------------------------------------
create function public.handle_new_crew()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.crew_members (crew_id, user_id, role, status)
  values (new.id, new.owner_id, 'leader', 'approved');
  return new;
end;
$$;

create trigger on_crew_created
  after insert on crews
  for each row execute function public.handle_new_crew();
