import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getConversationBetween, otherParticipant } from "@/lib/db/conversations";
import { listMessages } from "@/lib/db/messages";
import { getProfileByUserId } from "@/lib/db/profiles";
import { Avatar } from "@/features/feed/avatar";
import { MessageForm } from "@/features/messages/message-form";
import { MarkReadOnView } from "@/features/messages/mark-read-on-view";
import { relativeTime } from "@/lib/format/relative-time";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { BackIcon, ChevronRightIcon } from "@/components/ui/icons";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/messages/${conversationId}`);

  const supabase = await createClient();

  // RLS already scopes conversations to participants; fetch by id via
  // messages/conversations join isn't needed — select by id directly.
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (conversationError) throw conversationError;
  if (!conversation) notFound();

  const otherUserId = otherParticipant(conversation, user.id);
  const [otherProfile, messages] = await Promise.all([
    getProfileByUserId(supabase, otherUserId),
    listMessages(supabase, conversationId),
  ]);

  // Defense in depth: getConversationBetween re-derives the pair from
  // RLS-scoped rows, confirming this user really is a participant.
  const verified = await getConversationBetween(supabase, user.id, otherUserId);
  if (!verified || verified.id !== conversationId) notFound();

  const avatarMedia = otherProfile?.avatar_media_id
    ? await getMediaById(supabase, otherProfile.avatar_media_id).catch(() => null)
    : null;
  const avatarUrl = avatarMedia ? publicMediaUrl(supabase, avatarMedia.storage_path) : null;
  const username = otherProfile?.username ?? "unknown";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <MarkReadOnView conversationId={conversationId} />

      {/* Messages-style header: back on the left, the other person's
          photo and name stacked in the centre, tapping through to their
          profile. */}
      <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center border-b border-border px-3 py-2">
        <Link
          href="/messages"
          aria-label="Back to inbox"
          className="flex h-10 w-10 items-center justify-center rounded-full text-accent"
        >
          <BackIcon className="h-5 w-5" />
        </Link>
        <Link href={`/u/${username}`} className="flex flex-col items-center gap-1">
          <Avatar username={username} avatarUrl={avatarUrl} className="h-10 w-10 text-sm" />
          <span className="flex max-w-full items-center gap-0.5 truncate text-[0.75rem] font-medium">
            {otherProfile?.display_name || username}
            <ChevronRightIcon className="h-3 w-3 flex-shrink-0 text-muted" />
          </span>
        </Link>
        <span />
      </div>

      <div className="flex flex-1 flex-col px-3 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <Avatar username={username} avatarUrl={avatarUrl} className="h-20 w-20 text-3xl" />
            <p className="mt-3 text-[1.0625rem] font-semibold">{otherProfile?.display_name || username}</p>
            <p className="mt-1 text-[0.875rem] text-muted">Say hi to start the conversation.</p>
          </div>
        ) : (
          messages.map((message, i) => {
            const isMine = message.sender_id === user.id;
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const time = new Date(message.created_at).getTime();
            // A timestamp separator whenever an hour or more passed —
            // iMessage's rhythm, instead of a time on every bubble.
            const showTime = !prev || time - new Date(prev.created_at).getTime() > 60 * 60 * 1000;
            const sameSenderAsPrev = prev && prev.sender_id === message.sender_id && !showTime;
            const lastInRun =
              !next ||
              next.sender_id !== message.sender_id ||
              new Date(next.created_at).getTime() - time > 60 * 60 * 1000;

            return (
              <div key={message.id}>
                {showTime && (
                  <p
                    className="mb-2 mt-4 text-center text-[0.6875rem] font-medium text-muted first:mt-0"
                    suppressHydrationWarning
                  >
                    {relativeTime(message.created_at)}
                  </p>
                )}
                <div
                  className={`flex ${isMine ? "justify-end" : "justify-start"} ${
                    sameSenderAsPrev ? "mt-0.5" : "mt-2"
                  }`}
                >
                  <div
                    className={`max-w-[78%] rounded-[20px] px-3.5 py-2 text-[0.9375rem] leading-snug ${
                      isMine
                        ? `bg-accent text-accent-foreground ${lastInRun ? "rounded-br-[6px]" : ""}`
                        : `bg-foreground/[0.09] text-foreground ${lastInRun ? "rounded-bl-[6px]" : ""}`
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border px-3 py-2.5">
        <MessageForm conversationId={conversationId} />
      </div>
    </div>
  );
}
