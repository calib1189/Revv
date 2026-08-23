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

export function CommentForm({ postId }: { postId: string }) {
  const action = createCommentAction.bind(null, postId);
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
        <Input name="body" placeholder="Add a comment…" maxLength={2000} />
        <Button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 text-sm"
        >
          {isPending ? "Posting…" : "Post"}
        </Button>
      </div>
    </form>
  );
}
