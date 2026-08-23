"use client";

import { useActionState, useRef, useEffect } from "react";
import { sendMessageAction, type SendMessageState } from "@/features/messages/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";

const initialState: SendMessageState = { error: null };

export function MessageForm({ conversationId }: { conversationId: string }) {
  const action = sendMessageAction.bind(null, conversationId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      {state.error && <Callout tone="danger">{state.error}</Callout>}
      <div className="flex gap-2">
        <Input name="body" placeholder="Write a message…" maxLength={4000} />
        <Button type="submit" disabled={isPending} className="px-3 py-1.5 text-sm">
          {isPending ? "Sending…" : "Send"}
        </Button>
      </div>
    </form>
  );
}
