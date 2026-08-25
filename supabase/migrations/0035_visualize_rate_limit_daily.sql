-- Migrations are append-only — 0032 already shipped, so this replaces its
-- function body rather than editing that file. Tightening the cap from
-- 8/hour to 3/day: the image-generation call is billed per use, and 8/hour
-- (up to 192/day) was generous enough to leave real cost exposure per user.
-- 3/day still covers someone trying it on their actual car a few times.
create or replace function public.under_ai_visualize_rate_limit(p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select count(*) < 3
  from ai_visualize_attempts
  where user_id = p_user_id
    and created_at > now() - interval '1 day';
$$;
