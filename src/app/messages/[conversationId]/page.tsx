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
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
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

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 sm:px-6">
      <MarkReadOnView conversationId={conversationId} />

      <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
        <Link href="/messages" className="text-sm text-muted hover:text-foreground">
          &larr;
        </Link>
        <Avatar username={otherProfile?.username ?? "unknown"} />
        <Link
          href={`/u/${otherProfile?.username ?? ""}`}
          className="text-sm font-medium hover:underline"
        >
          @{otherProfile?.username ?? "unknown"}
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto py-2">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">No messages yet. Say hi.</p>
        ) : (
          messages.map((message) => {
            const isMine = message.sender_id === user.id;
            return (
              <div
                key={message.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    isMine
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.body}</p>
                  <p
                    className={`mt-0.5 text-[10px] ${isMine ? "text-accent-foreground/70" : "text-muted"}`}
                  >
                    {relativeTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-2 border-t border-border pt-4">
        <MessageForm conversationId={conversationId} />
      </div>
    </div>
  );
}
