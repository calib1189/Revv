import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listConversationsForUser, otherParticipant } from "@/lib/db/conversations";
import { getLastMessageForConversations } from "@/lib/db/messages";
import { getProfileByUserId, getProfilesByIds } from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listNotifications } from "@/lib/db/notifications";
import { loadStoryTray, type TrayPerson } from "@/lib/stories/load";
import { NOTIFICATION_VERBS } from "@/lib/notifications/verbs";
import { conversationStatus, summarizeNotifications } from "@/lib/inbox/summary";
import { StoryTray } from "@/features/stories/story-tray";
import { BellIcon, BoltIcon, SearchIcon } from "@/components/ui/icons";
import { Chip, ConversationRow, PinnedRow } from "@/features/inbox/inbox-rows";

type Filter = "all" | "unread";

/**
 * The inbox: stories along the top, All / Unread, the two pinned rows
 * (activity from people, and system notices), then every conversation,
 * newest first, each saying where it stands ("Seen", "Sent 2h").
 */
export default async function MessagesInboxPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");
  const filter: Filter = (await searchParams).filter === "unread" ? "unread" : "all";

  const supabase = await createClient();
  const [conversations, notifications, me, tray] = await Promise.all([
    listConversationsForUser(supabase, user.id),
    listNotifications(supabase, user.id).catch(() => []),
    getProfileByUserId(supabase, user.id),
    loadStoryTray(supabase, user.id).catch(() => [] as TrayPerson[]),
  ]);
  const { activity, system } = summarizeNotifications(notifications);

  const otherIds = conversations.map((c) => otherParticipant(c, user.id));
  const [lastByConversation, people] = await Promise.all([
    getLastMessageForConversations(
      supabase,
      conversations.map((c) => c.id),
    ),
    getProfilesByIds(supabase, [...new Set([...otherIds, ...(activity.latest?.actor_id ? [activity.latest.actor_id] : [])])]).catch(() => []),
  ]);
  const personById = new Map(people.map((p) => [p.id, p]));
  // Best-effort: a missing avatar just falls back to the initial.
  const avatarMedia = await getMediaByIds(
    supabase,
    [...people.map((p) => p.avatar_media_id), me?.avatar_media_id].filter((id): id is string => Boolean(id)),
  ).catch(() => []);
  const avatarUrl = new Map(avatarMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));
  const avatarOf = (mediaId: string | null | undefined) => (mediaId ? (avatarUrl.get(mediaId) ?? null) : null);

  const rows = conversations.map((c, i) => {
    const last = lastByConversation.get(c.id);
    return { conversation: c, person: personById.get(otherIds[i]), last, status: conversationStatus(last, user.id) };
  });
  const unreadCount = rows.filter((r) => r.status.unread).length;
  const shown = filter === "unread" ? rows.filter((r) => r.status.unread) : rows;

  const actor = activity.latest?.actor_id ? personById.get(activity.latest.actor_id) : null;
  const activityLine = activity.latest
    ? `${actor ? actor.username : "SORZA"} ${NOTIFICATION_VERBS[activity.latest.kind] ?? "sent you a notification"}`
    : "Likes, comments and new followers show up here";
  const systemLine = system.latest ? `SORZA ${NOTIFICATION_VERBS[system.latest.kind] ?? "sent you a notice"}` : null;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 pb-16 pt-3 sm:pt-8">
      <header className="flex h-12 items-center justify-between px-4">
        <span className="h-9 w-9" aria-hidden />
        <h1 className="text-[1.0625rem] font-bold">Inbox</h1>
        <Link href="/search" aria-label="Search" className="pressable flex h-9 w-9 items-center justify-center rounded-full text-foreground">
          <SearchIcon className="h-5 w-5" />
        </Link>
      </header>

      {me && (
        <div className="px-4 pb-3 pt-2">
          <StoryTray tray={tray} me={{ id: me.id, username: me.username, avatarUrl: avatarOf(me.avatar_media_id) }} />
        </div>
      )}

      <nav className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2" aria-label="Filter conversations">
        <Chip href="/messages" active={filter === "all"} label="All" count={rows.length} />
        <Chip href="/messages?filter=unread" active={filter === "unread"} label="Unread" count={unreadCount} />
      </nav>

      <ul className="mt-1">
        {filter === "all" && (
          <>
            <PinnedRow
              href="/notifications"
              icon={<BoltIcon className="h-6 w-6" />}
              iconClass="bg-accent text-accent-foreground"
              title="Activity & new followers"
              line={activityLine}
              unread={activity.unread}
              at={activity.latest?.created_at ?? null}
            />
            {systemLine && (
              <PinnedRow
                href="/notifications"
                icon={<BellIcon className="h-6 w-6" />}
                iconClass="bg-foreground/[0.08] text-foreground"
                title="System notifications"
                line={systemLine}
                unread={system.unread}
                at={system.latest?.created_at ?? null}
              />
            )}
          </>
        )}

        {shown.map(({ conversation, person, last, status }) => (
          <ConversationRow
            key={conversation.id}
            href={`/messages/${conversation.id}`}
            username={person?.username ?? "unknown"}
            name={person?.display_name || person?.username || "unknown"}
            verified={Boolean(person?.is_verified)}
            avatarUrl={avatarOf(person?.avatar_media_id)}
            status={status}
            at={last?.created_at ?? null}
          />
        ))}
      </ul>

      {shown.length === 0 && (
        <p className="px-6 pt-8 text-center text-[0.9375rem] text-muted">
          {filter === "unread" ? "You're all caught up." : "No messages yet. Start one from anyone's profile."}
        </p>
      )}
    </div>
  );
}
