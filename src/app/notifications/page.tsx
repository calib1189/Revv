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
import { EmptyState } from "@/components/ui/empty-state";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import {
  BackIcon,
  BellIcon,
  CommentIcon,
  HeartIcon,
  PersonIcon,
  UsersIcon,
  CheckIcon,
  CloseIcon,
  GemIcon,
  StarIcon,
  PinIcon,
} from "@/components/ui/icons";
import { relativeTime } from "@/lib/format/relative-time";
import { getShopReviewPlaceIds } from "@/lib/db/shop-reviews";
import { groupNotifications, groupedVerb } from "@/lib/notifications/group";
import { NOTIFICATION_VERBS } from "@/lib/notifications/verbs";

const KIND_VERB = NOTIFICATION_VERBS;

/** The small badge on each avatar that says what kind of activity it
 * was, the way iOS marks a notification's source. */
const KIND_BADGE: Record<string, { icon: ReactNode; color: string }> = {
  like: { icon: <HeartIcon className="h-2.5 w-2.5" />, color: "#ff375f" },
  comment: { icon: <CommentIcon className="h-2.5 w-2.5" />, color: "#0a84ff" },
  comment_reply: { icon: <CommentIcon className="h-2.5 w-2.5" />, color: "#0a84ff" },
  follow: { icon: <PersonIcon className="h-2.5 w-2.5" />, color: "#30d158" },
  peer_rating: { icon: <StarIcon className="h-2.5 w-2.5" />, color: "#ffd60a" },
  crew_join_request: { icon: <UsersIcon className="h-2.5 w-2.5" />, color: "#bf5af2" },
  crew_join_approved: { icon: <UsersIcon className="h-2.5 w-2.5" />, color: "#bf5af2" },
  crew_post: { icon: <UsersIcon className="h-2.5 w-2.5" />, color: "#bf5af2" },
  meetup_attending: { icon: <PinIcon className="h-2.5 w-2.5" />, color: "#ff453a" },
  shop_review: { icon: <StarIcon className="h-2.5 w-2.5" />, color: "#f0cd6e" },
  story_mention: { icon: <PersonIcon className="h-2.5 w-2.5" />, color: "#e1141f" },
  story_answer: { icon: <CommentIcon className="h-2.5 w-2.5" />, color: "#e1141f" },
  comment_reaction: { icon: <HeartIcon className="h-2.5 w-2.5" />, color: "#ff375f" },
  story_reaction: { icon: <HeartIcon className="h-2.5 w-2.5" />, color: "#e1141f" },
  invite_joined: { icon: <UsersIcon className="h-2.5 w-2.5" />, color: "#30d158" },
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
  // A shop review links to its shop, whose id is a Google place id rather
  // than the review's own id.
  const placeIdByReviewId = await getShopReviewPlaceIds(
    supabase,
    notifications
      .filter((n) => n.target_type === "shop_review" && n.target_id)
      .map((n) => n.target_id as string),
  ).catch(() => new Map<string, string>());
  const verifiedActorIds = new Set(actors.filter((a) => a.is_verified).map((a) => a.id));
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
    <div className="mx-auto w-full max-w-lg flex-1 pb-16 pt-3 sm:pt-8">
      {/* Same shape as the inbox it opens from (app/messages/page.tsx). */}
      <header className="grid h-12 grid-cols-[1fr_auto_1fr] items-center px-4">
        <Link href="/messages" aria-label="Back to inbox" className="pressable -ml-2 flex h-9 w-9 items-center justify-center rounded-full">
          <BackIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-[1.0625rem] font-bold">Activity</h1>
        <div className="flex justify-end">{hasUnread && <MarkAllReadButton />}</div>
      </header>

      {notifications.length === 0 ? (
        <div className="px-4 pt-4">
        <EmptyState
          card
          icon={<BellIcon />}
          title="No activity yet"
          body="Likes, comments, and new followers show up here."
        />
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-4">
          {groups
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <section key={group.title}>
                <h2 className="px-4 pb-1 pt-2 text-[0.8125rem] font-semibold text-muted">{group.title}</h2>
                <ul>
                  {/* Repeats from one person fold into one row
                      ("liked 2 of your posts"); the newest one leads. */}
                  {groupNotifications(group.items).map(({ lead: n, targetCount, unread }) => {
                    const username = n.actor_id
                      ? (usernameByActorId.get(n.actor_id) ?? "unknown")
                      : "SORZA";
                    const verb = groupedVerb(n.kind, targetCount, KIND_VERB[n.kind] ?? n.kind);
                    const badge = KIND_BADGE[n.kind];
                    const href =
                      n.kind === "follow" || n.kind === "invite_joined"
                        ? `/u/${username}`
                        : n.target_type === "crew" && n.target_id
                          ? n.kind === "crew_join_request"
                            ? `/crews/${n.target_id}/requests`
                            : `/crews/${n.target_id}`
                          : n.target_type === "post" && n.target_id
                            ? `/p/${n.target_id}`
                          : n.target_type === "story" && n.target_id
                            ? `/stories/${n.target_id}`
                            : n.target_type === "meetup" && n.target_id
                              ? `/discover/${n.target_id}`
                              : n.target_type === "vehicle" && n.target_id
                                ? `/garage/${n.target_id}`
                                : n.target_type === "shop_review" && n.target_id && placeIdByReviewId.get(n.target_id)
                                  ? `/discover/shop/${encodeURIComponent(placeIdByReviewId.get(n.target_id)!)}`
                                : n.target_type === "ad_campaign"
                                  ? // No dedicated page for an advertiser to view their
                                    // own campaign yet — this at least lands somewhere
                                    // the now-live ad could plausibly be seen.
                                    "/feed"
                                  : "#";

                    return (
                      <li key={n.id}>
                        <Link
                          href={href}
                          className="flex items-center gap-3.5 px-4 py-3 transition-colors active:bg-foreground/[0.06]"
                        >
                          <span className="relative flex-shrink-0">
                            <Avatar
                              username={username}
                              avatarUrl={n.actor_id ? (avatarUrlByActorId.get(n.actor_id) ?? null) : null}
                              className="h-14 w-14 text-lg"
                            />
                            {badge && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 flex h-[20px] w-[20px] items-center justify-center rounded-full text-white ring-2 ring-background"
                                style={{ background: badge.color }}
                              >
                                {badge.icon}
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[0.9375rem] leading-snug">
                              <span className="font-semibold">{username}</span>
                              {n.actor_id && verifiedActorIds.has(n.actor_id) && (
                                <VerifiedBadge className="ml-1 h-3.5 w-3.5 align-[-0.15em]" />
                              )}{" "}
                              <span className={unread ? "" : "text-muted"}>{verb}</span>
                            </span>
                            <span className="mt-0.5 block text-[0.8125rem] text-muted" suppressHydrationWarning>
                              {relativeTime(n.created_at)}
                            </span>
                          </span>
                          {unread && <span aria-label="Unread" className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-accent" />}
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
