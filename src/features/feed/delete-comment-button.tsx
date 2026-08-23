"use client";

import { useTransition } from "react";
import { deleteCommentAction } from "@/features/feed/actions";

export function DeleteCommentButton({
  commentId,
  postId,
}: {
  commentId: string;
  postId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => deleteCommentAction(commentId, postId))}
      className="text-xs text-muted hover:text-danger disabled:opacity-60"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
