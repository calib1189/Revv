"use client";

import { useActionState, useRef, useEffect } from "react";
import {
  createCommentAction,
  type CommentFormState,
} from "@/features/feed/actions";
import { Callout } from "@/components/ui/callout";
import { ArrowUpIcon } from "@/components/ui/icons";

const initialState: CommentFormState = { error: null };

export function CommentForm({
  postId,
  parentId = null,
  autoFocus = false,
  onPosted,
}: {
  postId: string;
  /** Set when this form is a reply to a specific top-level comment,
   * rather than a new top-level comment on the post. */
  parentId?: string | null;
  autoFocus?: boolean;
  /** Called after a successful post — the feed's comment sheet uses this
   * to refresh its own list without a full page revalidation. */
  onPosted?: () => void;
}) {
  const action = createCommentAction.bind(null, postId, parentId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      formRef.current?.reset();
      onPosted?.();
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      {state.error && <Callout tone="danger">{state.error}</Callout>}
      <div className="flex items-center gap-1 rounded-full border border-border bg-background/60 py-1 pl-4 pr-1 transition-[box-shadow,border-color] focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/15">
        <input
          name="body"
          placeholder={parentId ? "Write a reply" : "Add a comment"}
          maxLength={2000}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-label={parentId ? "Reply" : "Comment"}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-foreground placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          aria-label={parentId ? "Post reply" : "Post comment"}
          className="pressable flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-50"
        >
          <ArrowUpIcon className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
