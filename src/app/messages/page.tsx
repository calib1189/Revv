import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listConversationsForUser, otherParticipant } from "@/lib/db/conversations";
import { getLastMessageForConversations } from "@/lib/db/messages";
import { getProfileByUserId } from "@/lib/db/profiles";
import { Avatar } from "@/features/feed/avatar";
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

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Messages</h1>

      {conversations.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-2 rounded-2xl py-24 text-center">
          <p className="text-lg font-medium">No conversations yet</p>
          <p className="max-w-xs text-sm text-muted">
            Message someone from their profile to start a conversation.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
          {conversations.map((conversation) => {
            const profile = profileByConversation.get(conversation.id);
            const lastMessage = lastMessageByConversation.get(conversation.id);
            const isUnread =
              lastMessage &&
              !lastMessage.read_at &&
              lastMessage.sender_id !== user.id;

            return (
              <li key={conversation.id}>
                <Link
                  href={`/messages/${conversation.id}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <Avatar username={profile?.username ?? "unknown"} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${isUnread ? "font-semibold" : "font-medium"}`}
                    >
                      @{profile?.username ?? "unknown"}
                    </p>
                    {lastMessage && (
                      <p className="truncate text-xs text-muted">
                        {lastMessage.body}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    {lastMessage && (
                      <span className="text-xs text-muted">
                        {relativeTime(lastMessage.created_at)}
                      </span>
                    )}
                    {isUnread && (
                      <span className="h-2 w-2 rounded-full bg-accent" />
                    )}
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
