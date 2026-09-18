import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listConversationsForUser, otherParticipant } from "@/lib/db/conversations";
import { getLastMessageForConversations } from "@/lib/db/messages";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { Avatar } from "@/features/feed/avatar";
import { InboxTabs } from "@/features/shell/inbox-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRightIcon, CommentIcon } from "@/components/ui/icons";
import { relativeTime } from "@/lib/format/relative-time";

export default async function MessagesInboxPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");

  const supabase = await createClient();
  const conversations = await listConversationsForUser(supabase, user.id);
  const lastMessageByConversation = await getLastMessageForConversations(
    supabase,
    conversations.map((c) => c.id),
  );

  const otherProfiles = await Promise.all(
    conversations.map((c) => getProfileByUserId(supabase, otherParticipant(c, user.id))),
  );
  const profileByConversation = new Map(
    conversations.map((c, i) => [c.id, otherProfiles[i]]),
  );
  // Best-effort: a missing avatar just falls back to the initial.
  const avatarMedia = await getMediaByIds(
    supabase,
    otherProfiles.map((p) => p?.avatar_media_id).filter((id): id is string => Boolean(id)),
  ).catch(() => []);
  const avatarUrlByMediaId = new Map(
    avatarMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]),
  );

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <h1 className="mb-5 text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Inbox</h1>
      <InboxTabs current="messages" />

      {conversations.length === 0 ? (
        <EmptyState
          card
          icon={<CommentIcon />}
          title="No messages yet"
          body="Start a conversation from anyone's profile."
        />
      ) : (
        <ul className="glass-raised elev-1 overflow-hidden rounded-[22px]">
          {conversations.map((conversation, i) => {
            const profile = profileByConversation.get(conversation.id);
            const lastMessage = lastMessageByConversation.get(conversation.id);
            const isUnread =
              lastMessage &&
              !lastMessage.read_at &&
              lastMessage.sender_id !== user.id;
            const avatarUrl = profile?.avatar_media_id
              ? (avatarUrlByMediaId.get(profile.avatar_media_id) ?? null)
              : null;

            return (
              <li key={conversation.id} className="relative">
                {i > 0 && <span className="absolute left-[5.25rem] right-0 top-0 h-px bg-border" />}
                <Link
                  href={`/messages/${conversation.id}`}
                  className="flex items-center gap-3 py-3 pl-2 pr-4 transition-colors active:bg-foreground/[0.06]"
                >
                  <span
                    aria-label={isUnread ? "Unread" : undefined}
                    className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${isUnread ? "bg-accent" : ""}`}
                  />
                  <Avatar
                    username={profile?.username ?? "unknown"}
                    avatarUrl={avatarUrl}
                    className="h-[52px] w-[52px] text-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="min-w-0 flex-1 truncate text-[1rem] font-semibold">
                        {profile?.display_name || profile?.username || "unknown"}
                      </p>
                      {lastMessage && (
                        <span className="flex flex-shrink-0 items-center gap-0.5 text-[0.8125rem] text-muted" suppressHydrationWarning>
                          {relativeTime(lastMessage.created_at)}
                          <ChevronRightIcon className="h-3.5 w-3.5 text-muted/60" />
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-0.5 line-clamp-2 text-[0.875rem] leading-snug ${
                        isUnread ? "text-foreground" : "text-muted"
                      }`}
                    >
                      {lastMessage
                        ? `${lastMessage.sender_id === user.id ? "You: " : ""}${lastMessage.body}`
                        : `@${profile?.username ?? "unknown"}`}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
