"use server";

import { createClient } from "@/lib/supabase/server";
import { buildUserContext } from "@/lib/assistant/build-context";
import { getChatProvider } from "@/lib/providers/get-chat-provider";
import {
  isUnderAssistantRateLimit,
  recordAssistantMessage,
} from "@/lib/assistant/assistant-rate-limit";
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
  if (!(await isUnderAssistantRateLimit(supabase, user.id))) {
    return {
      content: "You've sent a lot of messages — try again in a bit.",
      isMock: false,
    };
  }

  const context = await buildUserContext(supabase, user.id);
  const provider = getChatProvider();
  try {
    await recordAssistantMessage(supabase, user.id);
    return await provider.sendMessage(messages, context);
  } catch {
    return {
      content: "Couldn't reach the assistant right now. Try again in a bit.",
      isMock: false,
    };
  }
}
