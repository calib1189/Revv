-- Same gap as 0031, worse: generateVisualizationAction (the AI mod
-- visualizer) calls an image-generation API that, per this project's own
-- provider docs, requires real billing — unlike the free-tier vision/
-- rating calls. It had zero auth check and zero rate limit, meaning this
-- Server Action was reachable directly, unauthenticated, with no cap at
-- all on the single most expensive AI call in the app.

create table ai_visualize_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table ai_visualize_attempts enable row level security;

create policy "users record their own visualize attempts"
  on ai_visualize_attempts for insert
  with check (auth.uid() = user_id);

create index ai_visualize_attempts_user_id_created_at_idx
  on ai_visualize_attempts (user_id, created_at);

-- Lower cap than identify (20/hour) since this is the more expensive
-- billed call, not a free-tier one — still generous for someone actually
-- experimenting with a few prompts on their own car.
create or replace function public.under_ai_visualize_rate_limit(p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select count(*) < 8
  from ai_visualize_attempts
  where user_id = p_user_id
    and created_at > now() - interval '1 hour';
$$;

revoke all on function public.under_ai_visualize_rate_limit(uuid) from public;
grant execute on function public.under_ai_visualize_rate_limit(uuid) to authenticated;
