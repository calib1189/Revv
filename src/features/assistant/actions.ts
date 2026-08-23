"use server";

import { createClient } from "@/lib/supabase/server";
import { buildUserContext } from "@/lib/assistant/build-context";
import { getChatProvider } from "@/lib/providers/get-chat-provider";
import type { ChatMessage, ChatReply } from "@/lib/providers/chat-provider";

export async function sendChatMessageAction(
  messages: ChatMessage[],
): Promise<ChatReply> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { content: "You must be logged in.", isMock: true };
  }

  const context = await buildUserContext(supabase, user.id);
  const provider = getChatProvider();
  return provider.sendMessage(messages, context);
}
