import Link from "next/link";
import type { ReactNode } from "react";
import { INVITE_TIERS, countedInvites, invitePath, inviteProgress } from "@/lib/invites/tiers";
import { SITE_URL } from "@/lib/site-url";
import { relativeTime } from "@/lib/format/relative-time";
import { Avatar } from "@/features/feed/avatar";
import { InviteLinkCard } from "@/features/invites/invite-link-card";
import { SectionTitle } from "@/components/ui/grouped-list";
import { CheckIcon, UsersIcon } from "@/components/ui/icons";

export interface InviteeRow {
  id: string;
  username: string;
  avatarUrl: string | null;
  joinedAt: string;
  /** Added a car, so this invite counts. */
  counts: boolean;
}

/** Invite friends: your link, how far you are up the reward ladder, and
 * everyone you've brought in, newest first. `inviterSlot` is the "Did
 * someone invite you?" card for a new account. */
export function InviteView({
  username,
  invitees,
  inviterSlot,
}: {
  username: string;
  invitees: InviteeRow[];
  inviterSlot?: ReactNode;
}) {
  const counted = countedInvites(invitees.map((i) => ({ hasCar: i.counts })));
  const { next, toNext } = inviteProgress(counted);
  // Toward the next reward's total, so reaching one never shows an empty bar.
  const progress = next ? counted / next.count : 1;
  const waiting = invitees.length - counted;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Invite friends</h1>
      <p className="mt-1 text-[0.9375rem] text-muted">Bring your crew to SORZA and build your reputation.</p>

      <div className="mt-6 flex flex-col gap-8">
        <InviteLinkCard url={`${SITE_URL}${invitePath(username)}`} username={username} />

        <section>
          <SectionTitle>Your progress</SectionTitle>
          <div className="glass-raised elev-1 rounded-[22px] p-5">
            <div className="flex items-end justify-between gap-4">
              <p>
                <span className="numeral text-[2.5rem] font-bold leading-none tracking-[-0.03em]">{counted}</span>
                <span className="ml-1.5 text-[0.9375rem] text-muted">{counted === 1 ? "invite counts" : "invites count"}</span>
              </p>
              {next && (
                <p className="pb-1 text-right text-[0.8125rem] text-muted">
                  {toNext} more to <span className="font-semibold text-foreground">{next.name}</span>
                </p>
              )}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-foreground/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="mt-3 text-[0.8125rem] leading-snug text-muted">
              An invite counts once your friend adds their car.
              {waiting > 0 && ` ${waiting} ${waiting === 1 ? "friend hasn't" : "friends haven't"} added one yet.`}
            </p>
          </div>
        </section>

        <section>
          <SectionTitle>Rewards</SectionTitle>
          <ul className="glass-raised elev-1 overflow-hidden rounded-[22px]">
            {INVITE_TIERS.map((tier, i) => {
              const reached = counted >= tier.count;
              return (
                <li key={tier.count} className="relative flex items-center gap-4 px-4 py-3.5">
                  {i > 0 && <span className="absolute left-[4.25rem] right-0 top-0 h-px bg-border" />}
                  <span
                    className={`numeral flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[0.9375rem] font-bold ${
                      reached ? "bg-success text-white" : "bg-foreground/[0.07] text-muted"
                    }`}
                  >
                    {reached ? <CheckIcon className="h-4.5 w-4.5" /> : tier.count}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-semibold">{tier.name}</span>
                    <span className="block text-[0.8125rem] leading-snug text-muted">
                      {tier.count} invites · {tier.reward}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 px-4 text-[0.8125rem] leading-snug text-muted">
            Each reward is also an achievement on your profile. Claim it there for points.
          </p>
        </section>

        <section>
          <SectionTitle>People you invited</SectionTitle>
          {invitees.length === 0 ? (
            <div className="glass-raised elev-1 flex flex-col items-center rounded-[22px] px-6 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.07] text-muted">
                <UsersIcon className="h-6 w-6" />
              </span>
              <p className="mt-3 text-[0.9375rem] font-semibold">No one yet</p>
              <p className="mt-1 text-[0.8125rem] leading-snug text-muted">
                Share your link. Everyone who joins with it shows up here.
              </p>
            </div>
          ) : (
            <ul className="glass-raised elev-1 overflow-hidden rounded-[22px]">
              {invitees.map((invitee, i) => {
                return (
                  <li key={invitee.id} className="relative">
                    {i > 0 && <span className="absolute left-[4.25rem] right-0 top-0 h-px bg-border" />}
                    <Link href={`/u/${invitee.username}`} className="pressable flex items-center gap-3 px-4 py-3">
                      <Avatar username={invitee.username} avatarUrl={invitee.avatarUrl} className="h-10 w-10 text-base" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] font-semibold">@{invitee.username}</span>
                        <span className="block text-[0.8125rem] text-muted">Joined {relativeTime(invitee.joinedAt)}</span>
                      </span>
                      <span
                        className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${
                          invitee.counts ? "bg-success/15 text-success" : "bg-foreground/[0.07] text-muted"
                        }`}
                      >
                        {invitee.counts ? "Counts" : "No car yet"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {inviterSlot}
      </div>
    </div>
  );
}
