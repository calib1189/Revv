import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getProfileByUserId, getProfilesByIds } from "@/lib/db/profiles";
import { getPlatformTotals, getActiveUserCounts } from "@/lib/analytics/queries";
import { getAdminQueueCounts } from "@/lib/admin/queue-counts";
import { listAuditLogs } from "@/lib/db/audit-logs";
import { relativeTime } from "@/lib/format/relative-time";
import { formatCompactNumber } from "@/lib/format/compact-number";
import { ADMIN_SECTION_GROUPS } from "@/features/admin/admin-sections";
import { GroupedList, GroupedRow, RowIcon, SectionTitle } from "@/components/ui/grouped-list";
import { CheckIcon, ChevronRightIcon, SearchIcon } from "@/components/ui/icons";

/** The admin home: what's waiting on a decision first, then how the
 * platform's doing, then every admin page grouped by job — the menu for
 * the whole admin area on a phone (see AdminChrome). */
export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const [me, counts, totals, active, logs] = await Promise.all([
    user ? getProfileByUserId(supabase, user.id) : Promise.resolve(null),
    getAdminQueueCounts(supabase),
    getPlatformTotals(supabase),
    getActiveUserCounts(supabase).catch(() => null),
    listAuditLogs(supabase, 5).catch(() => []),
  ]);

  const actorIds = [...new Set(logs.map((l) => l.actor_id).filter((id): id is string => Boolean(id)))];
  const actors = actorIds.length > 0 ? await getProfilesByIds(supabase, actorIds) : [];
  const usernameById = new Map(actors.map((p) => [p.id, p.username]));

  const reviewSections = ADMIN_SECTION_GROUPS[0].sections;
  const waiting = reviewSections.filter((s) => s.countKey && counts[s.countKey] > 0);

  const stats = [
    { label: "Users", value: totals.profiles },
    { label: "Vehicles", value: totals.vehicles },
    { label: "Posts", value: totals.posts },
    ...(active
      ? [
          { label: "Active today", value: active.last24h },
          { label: "Active this week", value: active.last7d },
        ]
      : []),
  ];

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <div className="mb-5">
        <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Admin</h1>
        {me && <p className="mt-0.5 text-[0.875rem] text-muted">Signed in as @{me.username}</p>}
      </div>

      {/* Straight to someone's account — the most common thing to look up. */}
      <form action="/admin/users" className="mb-8">
        <label className="glass-raised elev-1 flex items-center gap-2.5 rounded-full px-4">
          <SearchIcon className="h-4 w-4 flex-shrink-0 text-muted" />
          <span className="sr-only">Find a user</span>
          <input
            type="search"
            name="q"
            placeholder="Find a user by username"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-muted/60"
          />
        </label>
      </form>

      <section className="mb-8">
        <SectionTitle action={counts.total > 0 ? `${counts.total} waiting` : undefined}>
          Needs your attention
        </SectionTitle>
        {waiting.length === 0 ? (
          <div className="glass-raised elev-1 flex items-center gap-3.5 rounded-[22px] p-4">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[0.9375rem] font-semibold">You&apos;re all caught up</p>
              <p className="text-[0.8125rem] text-muted">Nothing is waiting on a decision.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {waiting.map(({ href, label, icon: Icon, color, countKey }) => (
              <Link
                key={href}
                href={href}
                className="pressable glass-raised elev-1 flex flex-col gap-3 rounded-[22px] p-4"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-[9px] text-white [&>svg]:h-4 [&>svg]:w-4"
                    style={{ background: color }}
                  >
                    <Icon />
                  </span>
                  <ChevronRightIcon className="h-4 w-4 text-muted/60" />
                </div>
                <div>
                  <p className="numeral text-[1.75rem] leading-none">{countKey ? counts[countKey] : 0}</p>
                  <p className="mt-1 text-[0.8125rem] text-muted">{label}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <SectionTitle action={<Link href="/admin/analytics">Analytics</Link>}>Platform</SectionTitle>
        <div className="grid grid-cols-3 gap-2.5">
          {stats.map(({ label, value }) => (
            <div key={label} className="glass-raised elev-1 rounded-[18px] px-3 py-3.5">
              <p className="numeral text-[1.375rem] leading-none">{formatCompactNumber(value)}</p>
              <p className="mt-1.5 text-[0.75rem] text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-8">
        {ADMIN_SECTION_GROUPS.map((group) => (
          <section key={group.title}>
            <SectionTitle>{group.title}</SectionTitle>
            <GroupedList>
              {group.sections.map(({ href, label, description, icon: Icon, color, countKey }) => {
                const count = countKey ? counts[countKey] : 0;
                return (
                  <GroupedRow
                    key={href}
                    href={href}
                    label={label}
                    detail={description}
                    icon={
                      <RowIcon color={color}>
                        <Icon />
                      </RowIcon>
                    }
                    value={
                      count > 0 ? (
                        <span className="numeral rounded-full bg-danger px-2 py-0.5 text-[0.75rem] font-semibold text-white">
                          {count}
                        </span>
                      ) : undefined
                    }
                  />
                );
              })}
            </GroupedList>
          </section>
        ))}

        <section>
          <SectionTitle action={<Link href="/admin/audit-log">See all</Link>}>Recent admin actions</SectionTitle>
          {logs.length === 0 ? (
            <p className="px-1 text-[0.875rem] text-muted">No admin actions yet.</p>
          ) : (
            <GroupedList>
              {logs.map((log) => (
                <GroupedRow
                  key={log.id}
                  label={
                    <>
                      <span className="font-medium">
                        @{log.actor_id ? (usernameById.get(log.actor_id) ?? "unknown") : "system"}
                      </span>{" "}
                      <span className="text-muted">{log.action}</span>
                    </>
                  }
                  detail={log.target_type ?? undefined}
                  value={<span suppressHydrationWarning>{relativeTime(log.created_at)}</span>}
                />
              ))}
            </GroupedList>
          )}
        </section>
      </div>
    </div>
  );
}
