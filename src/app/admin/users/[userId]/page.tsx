import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { getUserActivityEvents } from "@/lib/analytics/queries";
import { countByDay, groupTimeline, type TimelineItem } from "@/lib/analytics/recent-activity";
import { addDays, dailyDateKey, DAILY_TIME_ZONE } from "@/lib/daily/day";
import { relativeTime } from "@/lib/format/relative-time";
import { Avatar } from "@/features/feed/avatar";
import { GroupedList, GroupedRow, SectionTitle } from "@/components/ui/grouped-list";
import { EmptyState } from "@/components/ui/empty-state";
import { ClockIcon } from "@/components/ui/icons";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STRIP_DAYS = 30;
const TIMELINE_LIMIT = 60;

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: DAILY_TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const dayFormat = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });

/** "Mon, Nov 23, 6:21 PM CT" — the admin runs on Central, like Daily. */
function centralTime(iso: string) {
  return `${timeFormat.format(new Date(iso))} CT`;
}

function dayLabel(key: string) {
  return dayFormat.format(new Date(`${key}T00:00:00Z`));
}

function describeItem(item: TimelineItem): { label: string; detail: string } {
  const at = centralTime(item.at);
  switch (item.kind) {
    case "view": {
      if (item.count === 1) return { label: "Viewed a post", detail: at };
      const minutes = Math.max(1, Math.round((Date.parse(item.at) - Date.parse(item.startAt)) / 60000));
      return { label: `Viewed ${item.count} posts`, detail: `${at} · over ${minutes} min` };
    }
    case "like":
      return { label: "Liked a post", detail: at };
    case "comment":
      return { label: item.body ? `Commented “${item.body}”` : "Commented a GIF", detail: at };
    case "post":
      return { label: "Posted", detail: at };
  }
}

/** Everything one person has done on SORZA and when — what tapping
 * someone in Users or Activity opens. */
export default async function AdminUserActivityPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!UUID.test(userId)) notFound();

  const supabase = await createClient();
  const [profile, events] = await Promise.all([
    getProfileByUserId(supabase, userId),
    getUserActivityEvents(supabase, userId),
  ]);
  if (!profile) notFound();

  const avatar = profile.avatar_media_id
    ? (await getMediaByIds(supabase, [profile.avatar_media_id]).catch(() => []))[0]
    : undefined;
  const avatarUrl = avatar ? publicMediaUrl(supabase, avatar.storage_path) : null;

  const lastSeenAt = events[0]?.at ?? null;
  const total = (kind: TimelineItem["kind"]) => events.filter((e) => e.kind === kind).length;
  const todayKey = dailyDateKey();
  const dayKeys = Array.from({ length: STRIP_DAYS }, (_, i) => addDays(todayKey, i - (STRIP_DAYS - 1)));
  const days = countByDay(events, dayKeys, (d) => dailyDateKey(d));
  const activeDays = days.filter((d) => d.count > 0).length;
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const timeline = groupTimeline(events);

  const stats = [
    { label: "Posts", value: total("post") },
    { label: "Comments", value: total("comment") },
    { label: "Likes", value: total("like") },
    { label: "Posts viewed", value: total("view") },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <div className="mb-6 flex items-center gap-4">
        <Avatar username={profile.username} avatarUrl={avatarUrl} className="h-16 w-16 flex-shrink-0 text-xl" />
        <div className="min-w-0">
          <h1 className="truncate text-[1.75rem] font-bold leading-tight tracking-[-0.03em]">
            {profile.display_name || `@${profile.username}`}
          </h1>
          <p className="truncate text-[0.875rem] text-muted">
            {profile.display_name ? `@${profile.username} · ` : ""}
            <Link href={`/u/${profile.username}`} className="font-semibold text-accent">
              View profile
            </Link>
          </p>
        </div>
      </div>

      <div className="glass-raised elev-1 mb-6 flex items-center gap-3 rounded-[22px] p-4">
        <span
          className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
            lastSeenAt && days[days.length - 1].count > 0 ? "bg-success" : "bg-foreground/20"
          }`}
        />
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-semibold">
            {lastSeenAt ? `Last active ${relativeTime(lastSeenAt)}` : "Never active"}
          </p>
          <p className="text-[0.8125rem] text-muted">
            {lastSeenAt
              ? centralTime(lastSeenAt)
              : "Hasn't viewed, liked, commented or posted anything yet."}
            {" · "}Joined {centralTime(profile.created_at)}
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-4 gap-2">
        {stats.map(({ label, value }) => (
          <div key={label} className="glass-raised elev-1 rounded-[18px] px-3 py-3.5">
            <p className="numeral text-[1.375rem] leading-none">{value.toLocaleString("en-US")}</p>
            <p className="mt-1.5 text-[0.75rem] leading-tight text-muted">{label}</p>
          </div>
        ))}
      </div>

      <section className="mb-8">
        <SectionTitle action={`On ${activeDays} of 30 days`}>Last 30 days</SectionTitle>
        <div className="glass-raised elev-1 rounded-[22px] p-4">
          <div className="flex h-16 items-end gap-[3px]" role="img" aria-label={`Active on ${activeDays} of the last 30 days`}>
            {days.map((d) => (
              <div
                key={d.key}
                title={`${dayLabel(d.key)}: ${d.count} ${d.count === 1 ? "action" : "actions"}`}
                className={`flex-1 rounded-[3px] ${d.count > 0 ? "bg-accent" : "bg-foreground/[0.08]"}`}
                style={{ height: d.count > 0 ? `${Math.max(12, (d.count / maxDay) * 100)}%` : "12%" }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[0.75rem] text-muted">
            <span>{dayLabel(dayKeys[0])}</span>
            <span>Today</span>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>History</SectionTitle>
        {timeline.length === 0 ? (
          <EmptyState card icon={<ClockIcon />} title="Nothing yet" body="Their views, likes, comments and posts show up here." />
        ) : (
          <>
            <GroupedList>
              {timeline.slice(0, TIMELINE_LIMIT).map((item) => {
                const { label, detail } = describeItem(item);
                return (
                  <GroupedRow
                    key={`${item.kind}-${item.at}-${item.postId}`}
                    href={item.count === 1 ? `/p/${item.postId}` : undefined}
                    label={label}
                    detail={detail}
                    value={relativeTime(item.at)}
                  />
                );
              })}
            </GroupedList>
            {timeline.length > TIMELINE_LIMIT && (
              <p className="mt-3 px-1 text-[0.75rem] text-muted">Showing the latest {TIMELINE_LIMIT}.</p>
            )}
          </>
        )}
        <p className="mt-3 px-1 text-[0.75rem] text-muted">
          Messages are private, so time spent only in DMs doesn&apos;t show here.
        </p>
      </section>
    </div>
  );
}
