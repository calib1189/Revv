import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listNotifications } from "@/lib/db/notifications";
import { getProfileByUserId } from "@/lib/db/profiles";
import { Avatar } from "@/features/feed/avatar";
import { MarkAllReadButton } from "@/features/notifications/mark-all-read-button";
import { PushOptIn } from "@/features/push/push-opt-in";
import { InboxTabs } from "@/features/shell/inbox-tabs";
import { relativeTime } from "@/lib/format/relative-time";

const KIND_VERB: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "started following you",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");

  const supabase = await createClient();
  const notifications = await listNotifications(supabase, user.id);

  const actorIds = [
    ...new Set(
      notifications
        .map((n) => n.actor_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const actors = await Promise.all(
    actorIds.map((id) => getProfileByUserId(supabase, id)),
  );
  const usernameByActorId = new Map(
    actors.filter(Boolean).map((a) => [a!.id, a!.username]),
  );

  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Notifications
        </h1>
        {hasUnread && <MarkAllReadButton />}
      </div>
      <InboxTabs current="activity" />

      <div className="mb-4">
        <PushOptIn />
      </div>

      {notifications.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-2 rounded-2xl py-24 text-center">
          <p className="text-lg font-medium">No notifications yet</p>
          <p className="max-w-xs text-sm text-muted">
            Likes and comments on your posts will show up here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
          {notifications.map((n) => {
            const username = n.actor_id
              ? (usernameByActorId.get(n.actor_id) ?? "unknown")
              : "REVV";
            const verb = KIND_VERB[n.kind] ?? n.kind;
            const href =
              n.kind === "follow"
                ? `/u/${username}`
                : n.target_type === "post" && n.target_id
                  ? `/p/${n.target_id}`
                  : "#";

            return (
              <li key={n.id} className="px-4 py-3">
                <Link
                  href={href}
                  className={`flex items-center gap-3 ${!n.read_at ? "font-medium" : ""}`}
                >
                  <Avatar username={username} />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">@{username}</span> {verb}
                  </span>
                  <span className="flex-shrink-0 text-xs text-muted">
                    {relativeTime(n.created_at)}
                  </span>
                  {!n.read_at && (
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
