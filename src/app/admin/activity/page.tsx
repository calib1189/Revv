import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getProfilesByIds } from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { getRecentActivity } from "@/lib/analytics/queries";
import { splitByDay } from "@/lib/analytics/recent-activity";
import { ActivityRow } from "@/features/admin/activity-row";
import { GroupedList } from "@/components/ui/grouped-list";
import { FilterChips } from "@/components/ui/segmented-links";
import { EmptyState } from "@/components/ui/empty-state";
import { UsersIcon } from "@/components/ui/icons";

const RANGES = {
  today: { label: "Today", days: 1, empty: "No one has been on in the last 24 hours." },
  week: { label: "This week", days: 7, empty: "No one has been on in the last 7 days." },
  month: { label: "30 days", days: 30, empty: "No one has been on in the last 30 days." },
} as const;
type Range = keyof typeof RANGES;

function isRange(value: string | undefined): value is Range {
  return value !== undefined && value in RANGES;
}

/** Who's been on SORZA, most recent first — what the "Active today" and
 * "Active this week" numbers on the dashboard open to. */
export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range: Range = isRange(params.range) ? params.range : "today";
  const { days, empty } = RANGES[range];

  const supabase = await createClient();
  const [user, fetched] = await Promise.all([getCurrentUser(), getRecentActivity(supabase, days)]);
  // "Today" is the last 24 hours, the same line the dashboard counts by.
  const activity = range === "today" ? splitByDay(fetched).today : fetched;

  const profiles = await getProfilesByIds(
    supabase,
    activity.map((a) => a.userId),
  );
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const avatars = await getMediaByIds(
    supabase,
    profiles.map((p) => p.avatar_media_id).filter((id): id is string => Boolean(id)),
  ).catch(() => []);
  const avatarUrlById = new Map(avatars.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <div className="mb-5">
        <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Activity</h1>
        <p className="mt-0.5 text-[0.875rem] text-muted">
          <span className="numeral">{activity.length}</span> {activity.length === 1 ? "person" : "people"} viewed,
          liked, commented or posted. Tap someone for their full history.
        </p>
      </div>

      <FilterChips
        className="mb-5"
        options={(Object.keys(RANGES) as Range[]).map((r) => ({
          href: r === "today" ? "/admin/activity" : `/admin/activity?range=${r}`,
          label: RANGES[r].label,
          active: r === range,
        }))}
      />

      {activity.length === 0 ? (
        <EmptyState card icon={<UsersIcon />} title="No one yet" body={empty} />
      ) : (
        <GroupedList>
          {activity.map((a) => {
            const p = profileById.get(a.userId);
            return (
              <ActivityRow
                key={a.userId}
                activity={a}
                username={p?.username ?? null}
                avatarUrl={p?.avatar_media_id ? (avatarUrlById.get(p.avatar_media_id) ?? null) : null}
                isYou={a.userId === user?.id}
              />
            );
          })}
        </GroupedList>
      )}

      <p className="mt-4 px-1 text-[0.75rem] text-muted">
        Counts cover the range you picked. People who only open messages aren&apos;t counted, since DMs are private.
      </p>
    </div>
  );
}
