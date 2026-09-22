import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listNotifications } from "@/lib/db/notifications";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { Avatar } from "@/features/feed/avatar";
import { MarkAllReadButton } from "@/features/notifications/mark-all-read-button";
import { InboxTabs } from "@/features/shell/inbox-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/grouped-list";
import {
  BellIcon,
  CommentIcon,
  HeartIcon,
  PersonIcon,
  UsersIcon,
  CheckIcon,
  CloseIcon,
  GemIcon,
} from "@/components/ui/icons";
import { relativeTime } from "@/lib/format/relative-time";

const KIND_VERB: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  comment_reply: "replied to your comment",
  follow: "started following you",
  crew_join_request: "requested to join your crew",
  crew_join_approved: "approved your request to join",
  crew_post: "posted in a crew you're in",
  // These four have no actor — an admin decision or an automated check,
  // never a specific person to attribute it to (see the triggers in
  // 0092_more_notification_kinds.sql, every one inserts actor_id: null).
  // Rendered with username "SORZA" (the page's existing fallback for a
  // null actor_id), so the sentence needs to read naturally after that.
  meetup_approved: "approved your meet — it's live",
  meetup_rejected: "didn't approve your meet",
  ad_approved: "approved your ad — it's live",
  vehicle_verified: "verified your vehicle",
};

/** The small badge on each avatar that says what kind of activity it
 * was, the way iOS marks a notification's source. */
const KIND_BADGE: Record<string, { icon: ReactNode; color: string }> = {
  like: { icon: <HeartIcon className="h-2.5 w-2.5" />, color: "#ff375f" },
  comment: { icon: <CommentIcon className="h-2.5 w-2.5" />, color: "#0a84ff" },
  comment_reply: { icon: <CommentIcon className="h-2.5 w-2.5" />, color: "#0a84ff" },
  follow: { icon: <PersonIcon className="h-2.5 w-2.5" />, color: "#30d158" },
  crew_join_request: { icon: <UsersIcon className="h-2.5 w-2.5" />, color: "#bf5af2" },
  crew_join_approved: { icon: <UsersIcon className="h-2.5 w-2.5" />, color: "#bf5af2" },
  crew_post: { icon: <UsersIcon className="h-2.5 w-2.5" />, color: "#bf5af2" },
  meetup_approved: { icon: <CheckIcon className="h-2.5 w-2.5" />, color: "#30d158" },
  meetup_rejected: { icon: <CloseIcon className="h-2.5 w-2.5" />, color: "#8e8e93" },
  ad_approved: { icon: <CheckIcon className="h-2.5 w-2.5" />, color: "#30d158" },
  vehicle_verified: { icon: <GemIcon className="h-2.5 w-2.5" />, color: "#f0cd6e" },
};

const DAY_MS = 24 * 60 * 60 * 1000;

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
  const actors = (await Promise.all(actorIds.map((id) => getProfileByUserId(supabase, id)))).filter(
    (a): a is NonNullable<typeof a> => Boolean(a),
  );
  const usernameByActorId = new Map(actors.map((a) => [a.id, a.username]));
  // Best-effort: a missing avatar just falls back to the initial.
  const avatarMedia = await getMediaByIds(
    supabase,
    actors.map((a) => a.avatar_media_id).filter((id): id is string => Boolean(id)),
  ).catch(() => []);
  const avatarUrlByMediaId = new Map(
    avatarMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]),
  );
  const avatarUrlByActorId = new Map(
    actors.map((a) => [a.id, a.avatar_media_id ? (avatarUrlByMediaId.get(a.avatar_media_id) ?? null) : null]),
  );

  const hasUnread = notifications.some((n) => !n.read_at);

  // Mail-style sections by age. Computed at request time on the server.
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();
  const groups: { title: string; items: typeof notifications }[] = [
    { title: "Today", items: [] },
    { title: "This Week", items: [] },
    { title: "Earlier", items: [] },
  ];
  for (const n of notifications) {
    const age = now - new Date(n.created_at).getTime();
    groups[age < DAY_MS ? 0 : age < 7 * DAY_MS ? 1 : 2].items.push(n);
  }

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <header className="mb-5 flex items-end justify-between gap-4">
        <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Inbox</h1>
        {hasUnread && (
          <div className="mb-1.5">
            <MarkAllReadButton />
          </div>
        )}
      </header>
      <InboxTabs current="activity" />

      {notifications.length === 0 ? (
        <EmptyState
          card
          icon={<BellIcon />}
          title="No activity yet"
          body="Likes, comments, and new followers show up here."
        />
      ) : (
        <div className="flex flex-col gap-7">
          {groups
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <section key={group.title}>
                <SectionTitle>{group.title}</SectionTitle>
                <ul className="glass-raised elev-1 overflow-hidden rounded-[22px]">
                  {group.items.map((n, i) => {
                    const username = n.actor_id
                      ? (usernameByActorId.get(n.actor_id) ?? "unknown")
                      : "SORZA";
                    const verb = KIND_VERB[n.kind] ?? n.kind;
                    const badge = KIND_BADGE[n.kind];
                    const href =
                      n.kind === "follow"
                        ? `/u/${username}`
                        : n.target_type === "crew" && n.target_id
                          ? n.kind === "crew_join_request"
                            ? `/crews/${n.target_id}/requests`
                            : `/crews/${n.target_id}`
                          : n.target_type === "post" && n.target_id
                            ? `/p/${n.target_id}`
                            : n.target_type === "meetup" && n.target_id
                              ? `/discover/${n.target_id}`
                              : n.target_type === "vehicle" && n.target_id
                                ? `/garage/${n.target_id}`
                                : n.target_type === "ad_campaign"
                                  ? // No dedicated page for an advertiser to view their
                                    // own campaign yet — this at least lands somewhere
                                    // the now-live ad could plausibly be seen.
                                    "/feed"
                                  : "#";

                    return (
                      <li key={n.id} className="relative">
                        {i > 0 && <span className="absolute left-[4.75rem] right-0 top-0 h-px bg-border" />}
                        <Link
                          href={href}
                          className="flex items-center gap-3 py-3 pl-2 pr-4 transition-colors active:bg-foreground/[0.06]"
                        >
                          <span
                            aria-label={n.read_at ? undefined : "Unread"}
                            className={`h-2 w-2 flex-shrink-0 rounded-full ${n.read_at ? "" : "bg-accent"}`}
                          />
                          <span className="relative flex-shrink-0">
                            <Avatar
                              username={username}
                              avatarUrl={n.actor_id ? (avatarUrlByActorId.get(n.actor_id) ?? null) : null}
                              className="h-11 w-11 text-base"
                            />
                            {badge && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full text-white ring-2 ring-[var(--glass-solid-raised)]"
                                style={{ background: badge.color }}
                              >
                                {badge.icon}
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1 text-[0.9375rem] leading-snug">
                            <span className="font-semibold">{username}</span>{" "}
                            <span className={n.read_at ? "text-muted" : ""}>{verb}</span>
                          </span>
                          <span className="flex-shrink-0 self-start pt-0.5 text-[0.8125rem] text-muted" suppressHydrationWarning>
                            {relativeTime(n.created_at)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
