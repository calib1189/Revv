"use client";

import { useTransition } from "react";
import { deleteCommentAction } from "@/features/feed/actions";

export function DeleteCommentButton({
  commentId,
  postId,
  onDeleted,
}: {
  commentId: string;
  postId: string;
  /** The feed's comment sheet holds its own imperatively-fetched copy of
   * the list — deleting a comment there needs an explicit refresh, since
   * revalidatePath("/p/[postId]") has no effect on that local state. */
  onDeleted?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await deleteCommentAction(commentId, postId);
      onDeleted?.();
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="text-xs text-muted hover:text-danger disabled:opacity-60"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
