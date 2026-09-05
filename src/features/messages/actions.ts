"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireConfirmedUser as requireUser } from "@/lib/auth/require-confirmed-user";
import { getOrCreateConversation, getConversationById } from "@/lib/db/conversations";
import { sendMessage, markConversationRead } from "@/lib/db/messages";
import { validateMessageBody } from "@/lib/validation/message";
import { getProfileByUserId } from "@/lib/db/profiles";
import { sendPushToUser } from "@/lib/push/send";

export async function startConversationAction(
  otherUserId: string,
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (user.id === otherUserId) return { error: "You can't message yourself." };

  let conversationId: string;
  try {
    const conversation = await getOrCreateConversation(
      supabase,
      user.id,
      otherUserId,
    );
    conversationId = conversation.id;
  } catch {
    return { error: "Couldn't start that conversation." };
  }

  redirect(`/messages/${conversationId}`);
}

export interface SendMessageState {
  error: string | null;
}

export async function sendMessageAction(
  conversationId: string,
  _prevState: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const body = String(formData.get("body") ?? "");
  const error = validateMessageBody(body);
  if (error) return { error };

  const { supabase, user } = await requireUser();
  try {
    await sendMessage(supabase, conversationId, user.id, body.trim());
  } catch {
    return { error: "Couldn't send that message." };
  }

  after(async () => {
    const conversation = await getConversationById(supabase, conversationId);
    if (!conversation) return;
    const otherUserId =
      conversation.user_a_id === user.id ? conversation.user_b_id : conversation.user_a_id;
    const actor = await getProfileByUserId(supabase, user.id);
    await sendPushToUser(otherUserId, {
      title: "SORZA",
      body: `@${actor?.username ?? "Someone"} sent you a message`,
      url: `/messages/${conversationId}`,
    });
  });

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { error: null };
}

export async function markConversationReadAction(
  conversationId: string,
): Promise<void> {
  const { supabase, user } = await requireUser();
  await markConversationRead(supabase, conversationId, user.id);
  revalidatePath("/messages");
}
