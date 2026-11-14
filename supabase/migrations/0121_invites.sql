-- Invites: who brought whom to SORZA.
--
-- One row per invited person, written once by that person (from the
-- invite link they opened, or the username they typed on the welcome
-- screen). The inviter's count is never stored: lib/invites/tiers.ts
-- counts these rows at read time, and only counts an invite once the new
-- person has added a car, so throwaway signups don't move anyone up a
-- tier.

create table referrals (
  invitee_id uuid primary key references profiles (id) on delete cascade,
  referrer_id uuid not null references profiles (id) on delete cascade,
  source text not null check (source in ('link', 'username')),
  created_at timestamptz not null default now(),
  check (invitee_id <> referrer_id)
);

create index referrals_referrer_id_idx on referrals (referrer_id, created_at desc);

alter table referrals enable row level security;

-- You see who invited you, and everyone you invited.
create policy "people read their own invites"
  on referrals for select
  using (auth.uid() = invitee_id or auth.uid() = referrer_id);

create policy "admins read every invite"
  on referrals for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Only the new person says who invited them, only about themselves, and
-- only in their first week, so an older account can't be credited to a
-- friend after the fact. No update or delete: it's set once.
create policy "new accounts say who invited them"
  on referrals for insert
  with check (
    auth.uid() = invitee_id
    and referrer_id <> auth.uid()
    and exists (
      select 1 from profiles
      where id = auth.uid() and created_at > now() - interval '7 days'
    )
  );

-- Tell the inviter, the same way every other notification is made: a
-- trigger on the event itself (see 0092). The push goes out from the
-- Server Action that records the invite.
create function public.handle_new_referral()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
  values (new.referrer_id, 'invite_joined', new.invitee_id, 'profile', new.invitee_id);
  return new;
end;
$$;

create trigger on_referral_created
  after insert on referrals for each row execute function public.handle_new_referral();
