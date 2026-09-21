-- Native (iOS app) push tokens. push_subscriptions (0022) holds Web Push
-- endpoints, which a Capacitor WKWebView can't produce: it has no
-- PushManager. A native app instead asks iOS for an APNs device token,
-- which is a different shape (one opaque string, no keys) and is
-- delivered through a different service, so it gets its own table rather
-- than being forced into columns that mean something else.
--
-- One user can have several rows (phone and iPad), and one row is only
-- ever wanted by one user at a time.

create table device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  token text not null unique
    check (char_length(token) between 32 and 512 and token ~ '^[0-9a-fA-F]+$'),
  platform text not null default 'ios' check (platform in ('ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table device_push_tokens enable row level security;

-- A user can see and remove their own tokens, and that is all. There is
-- deliberately NO insert or update policy: registration goes through
-- register_device_push_token() below, for the reason spelled out there.
create policy "users read their own device push tokens"
  on device_push_tokens for select
  using (auth.uid() = user_id);

create policy "users delete their own device push tokens"
  on device_push_tokens for delete
  using (auth.uid() = user_id);

create index device_push_tokens_user_id_idx on device_push_tokens (user_id);

-- Why registration is a function and not a plain upsert.
--
-- An APNs token belongs to a physical device, not to an account. When
-- someone signs out and a different person signs in on the same phone,
-- the token is the same string. A client-side upsert on `token` would hit
-- the existing row, which belongs to the PREVIOUS user, and RLS (correctly)
-- refuses to let the new user update it. The upsert fails, the token stays
-- attached to the old account, and the old account keeps getting the new
-- person's notifications on that phone. That is a privacy leak, not a
-- cosmetic bug.
--
-- Reassigning ownership is exactly the thing RLS exists to forbid, so it
-- has to happen in a narrow, audited place instead: this function runs as
-- its owner, takes ONLY a token, and always assigns it to auth.uid().
-- The caller can never name a different user.
create function public.register_device_push_token(
  p_token text,
  p_platform text default 'ios'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.device_push_tokens (user_id, token, platform)
  values (auth.uid(), p_token, p_platform)
  on conflict (token) do update
    set user_id = auth.uid(),
        platform = excluded.platform,
        updated_at = now();
end;
$$;

-- Not callable by anonymous visitors, and not by PUBLIC (functions are
-- executable by everyone by default in Postgres).
revoke all on function public.register_device_push_token(text, text) from public;
revoke all on function public.register_device_push_token(text, text) from anon;
grant execute on function public.register_device_push_token(text, text) to authenticated;
