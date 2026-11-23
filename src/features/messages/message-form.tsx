"use client";

import { useActionState, useRef, useEffect, useState, startTransition } from "react";
import { sendMessageAction, type SendMessageState } from "@/features/messages/actions";
import { GifButton, GifPicker } from "@/features/gifs/gif-picker";
import type { GifRef } from "@/lib/gifs";
import { ArrowUpIcon } from "@/components/ui/icons";

const initialState: SendMessageState = { error: null };

/** Messages-style composer: a rounded field with a GIF button and a
 * circular send button tucked inside its right edge. */
export function MessageForm({ conversationId }: { conversationId: string }) {
  const action = sendMessageAction.bind(null, conversationId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [gifOpen, setGifOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state.error]);

  function sendGif(gif: GifRef) {
    const fd = new FormData();
    fd.set("gif_id", gif.id);
    fd.set("gif_width", String(gif.width));
    fd.set("gif_height", String(gif.height));
    setGifOpen(false);
    startTransition(() => formAction(fd));
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-1.5">
      {state.error && <p className="px-2 text-[0.8125rem] text-danger">{state.error}</p>}
      {gifOpen && <GifPicker onPick={sendGif} onClose={() => setGifOpen(false)} disabled={isPending} />}
      <div className="flex items-center gap-1 rounded-full border border-border bg-background/60 py-1 pl-4 pr-1">
        <input
          name="body"
          placeholder="Message"
          maxLength={4000}
          autoComplete="off"
          aria-label="Message"
          onFocus={() => setGifOpen(false)}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-foreground placeholder:text-muted/60 focus:outline-none"
        />
        <GifButton open={gifOpen} onClick={() => setGifOpen((o) => !o)} />
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
