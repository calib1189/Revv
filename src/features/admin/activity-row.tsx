import { GroupedRow } from "@/components/ui/grouped-list";
import { Avatar } from "@/features/feed/avatar";
import { describeActivity, type UserActivity } from "@/lib/analytics/recent-activity";
import { relativeTime } from "@/lib/format/relative-time";

/** One person in an admin activity list: who, what they did, how long
 * ago. Opens their admin user page, where the full history is. */
export function ActivityRow({
  activity,
  username,
  avatarUrl,
  isYou,
}: {
  activity: UserActivity;
  /** null when the profile is gone (deleted account). */
  username: string | null;
  avatarUrl: string | null;
  isYou: boolean;
}) {
  return (
    <GroupedRow
      href={username ? `/admin/users/${activity.userId}` : undefined}
      icon={
        <Avatar username={username ?? "deleted"} avatarUrl={avatarUrl} className="h-9 w-9 flex-shrink-0 text-sm" />
      }
      label={
        <>
          <span className="font-medium">@{username ?? "deleted"}</span>
          {isYou && <span className="text-muted"> (you)</span>}
        </>
      }
      detail={describeActivity(activity)}
      value={relativeTime(activity.lastSeenAt)}
    />
  );
}
