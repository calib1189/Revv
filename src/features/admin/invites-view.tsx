import { FEATURE_INVITES, type InviteLeader } from "@/lib/invites/tiers";
import { relativeTime } from "@/lib/format/relative-time";
import { GroupedList, GroupedRow, RowIcon, SectionTitle } from "@/components/ui/grouped-list";
import { PersonPlusIcon, StarIcon } from "@/components/ui/icons";

export interface RecentInvite {
  inviteeId: string;
  referrerId: string;
  createdAt: string;
  source: "link" | "username";
  hasCar: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

/** Admin → Invites: who brings people to SORZA, who's earned a feature,
 * and each signup that came from an invite. */
export function InvitesView({
  leaders,
  recent,
  usernames,
  now,
}: {
  leaders: InviteLeader[];
  recent: RecentInvite[];
  usernames: Record<string, string>;
  now: number;
}) {
  const name = (id: string) => (usernames[id] ? `@${usernames[id]}` : "Deleted account");
  const inLast = (days: number) => recent.filter((r) => now - new Date(r.createdAt).getTime() <= days * DAY);
  const last30 = inLast(30);
  const stats = [
    { label: "Invited, 7 days", value: inLast(7).length },
    { label: "Invited, 30 days", value: last30.length },
    { label: "Added a car, 30 days", value: last30.filter((r) => r.hasCar).length },
  ];
  const dueFeature = leaders.filter((l) => l.counted >= FEATURE_INVITES);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <div className="mb-6">
        <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Invites</h1>
        <p className="mt-0.5 text-[0.875rem] text-muted">
          Who brings people to SORZA. An invite counts once the new person adds a car.
        </p>
      </div>

      <section className="mb-8">
        <div className="grid grid-cols-3 gap-2.5">
          {stats.map(({ label, value }) => (
            <div key={label} className="glass-raised elev-1 rounded-[18px] px-3 py-3.5">
              <p className="numeral text-[1.25rem] leading-none tabular-nums">{value}</p>
              <p className="mt-1.5 text-[0.75rem] leading-snug text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {dueFeature.length > 0 && (
        <section className="mb-8">
          <SectionTitle>Due a feature</SectionTitle>
          <GroupedList footer={`Reached ${FEATURE_INVITES}+ invites that count. Feature them on SORZA's socials or the Daily.`}>
            {dueFeature.map((l) => (
              <GroupedRow
                key={l.referrerId}
                href={usernames[l.referrerId] ? `/u/${usernames[l.referrerId]}` : undefined}
                icon={
                  <RowIcon color="#ffd60a">
                    <StarIcon />
                  </RowIcon>
                }
                label={name(l.referrerId)}
                value={<span className="numeral font-semibold text-foreground tabular-nums">{l.counted}</span>}
              />
            ))}
          </GroupedList>
        </section>
      )}

      <section className="mb-8">
        <SectionTitle>Top inviters</SectionTitle>
        {leaders.length === 0 ? (
          <EmptyRow title="No invites yet" body="People who sign up with someone's invite show up here." />
        ) : (
          <GroupedList>
            {leaders.slice(0, 50).map((l, i) => (
              <GroupedRow
                key={l.referrerId}
                href={usernames[l.referrerId] ? `/u/${usernames[l.referrerId]}` : undefined}
                icon={
                  <span className="numeral flex h-[30px] w-[30px] items-center justify-center text-[0.9375rem] font-semibold text-muted tabular-nums">
                    {i + 1}
                  </span>
                }
                label={name(l.referrerId)}
                detail={
                  <span>
                    {l.total} signed up · last <span suppressHydrationWarning>{relativeTime(l.lastInviteAt)}</span>
                  </span>
                }
                value={
                  <span className="tabular-nums">
                    <span className="font-semibold text-foreground">{l.counted}</span> count
                  </span>
                }
              />
            ))}
          </GroupedList>
        )}
      </section>

      <section>
        <SectionTitle action={recent.length > 0 ? `${Math.min(recent.length, 100)} newest` : undefined}>
          Signups from invites
        </SectionTitle>
        {recent.length === 0 ? (
          <EmptyRow title="Nothing yet" body="Each signup that came from an invite shows up here." />
        ) : (
          <GroupedList>
            {recent.slice(0, 100).map((r) => (
              <GroupedRow
                key={r.inviteeId}
                href={usernames[r.inviteeId] ? `/u/${usernames[r.inviteeId]}` : undefined}
                icon={
                  <RowIcon color="#30d158">
                    <PersonPlusIcon />
                  </RowIcon>
                }
                label={name(r.inviteeId)}
                detail={
                  <span>
                    Invited by {name(r.referrerId)} · {r.source === "link" ? "link" : "typed username"} ·{" "}
                    <span suppressHydrationWarning>{relativeTime(r.createdAt)}</span>
                  </span>
                }
                value={
                  <span className={r.hasCar ? "font-semibold text-success" : "text-muted"}>
                    {r.hasCar ? "Has a car" : "No car yet"}
                  </span>
                }
              />
            ))}
          </GroupedList>
        )}
      </section>
    </div>
  );
}

function EmptyRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass-raised elev-1 flex items-center gap-3.5 rounded-[22px] p-4">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface text-muted">
        <PersonPlusIcon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[0.9375rem] font-semibold">{title}</p>
        <p className="text-[0.8125rem] text-muted">{body}</p>
      </div>
    </div>
  );
}
