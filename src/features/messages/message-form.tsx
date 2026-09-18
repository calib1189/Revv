"use client";

import { useActionState, useRef, useEffect } from "react";
import { sendMessageAction, type SendMessageState } from "@/features/messages/actions";
import { ArrowUpIcon } from "@/components/ui/icons";

const initialState: SendMessageState = { error: null };

/** Messages-style composer: a rounded field with a circular send
 * button tucked inside its right edge. */
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
    <form ref={formRef} action={formAction} className="flex flex-col gap-1.5">
      {state.error && <p className="px-2 text-[0.8125rem] text-danger">{state.error}</p>}
      <div className="flex items-center gap-1 rounded-full border border-border bg-background/60 py-1 pl-4 pr-1">
        <input
          name="body"
          placeholder="Message"
          maxLength={4000}
          autoComplete="off"
          aria-label="Message"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-foreground placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          aria-label="Send"
          className="pressable flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-50"
        >
          <ArrowUpIcon className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
