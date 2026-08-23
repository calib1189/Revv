"use client";

import { useEffect } from "react";
import { markConversationReadAction } from "@/features/messages/actions";

export function MarkReadOnView({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    markConversationReadAction(conversationId);
  }, [conversationId]);

  return null;
}
