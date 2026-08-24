"use client";

import { useActionState, useRef, useEffect } from "react";
import {
  createCommentAction,
  type CommentFormState,
} from "@/features/feed/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";

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
      <div className="flex gap-2">
        <Input
          name="body"
          placeholder={parentId ? "Write a reply…" : "Add a comment…"}
          maxLength={2000}
          autoFocus={autoFocus}
        />
        <Button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 text-sm"
        >
          {isPending ? "Posting…" : parentId ? "Reply" : "Post"}
        </Button>
      </div>
    </form>
  );
}
