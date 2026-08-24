"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CommentList } from "@/features/feed/comment-list";
import { CommentForm } from "@/features/feed/comment-form";
import { listCommentsForSheetAction, type CommentSheetData } from "@/features/feed/actions";
import { CloseIcon } from "@/components/ui/icons";

export function CommentSheet({
  postId,
  isOpen,
  onClose,
  isAuthenticated,
  initialCount,
}: {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  initialCount: number;
}) {
  const [data, setData] = useState<CommentSheetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [count, setCount] = useState(initialCount);

  async function refresh() {
    setIsLoading(true);
    try {
      const next = await listCommentsForSheetAction(postId);
      setData(next);
      setCount(next.comments.length);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen && data === null) {
      Promise.resolve().then(() => refresh());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <>
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-20 bg-black/60 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-label="Comments"
        className={`absolute inset-x-0 bottom-0 z-30 flex h-[65%] flex-col rounded-t-2xl border-t border-white/10 bg-surface transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex flex-shrink-0 flex-col items-center gap-2 pb-2 pt-2.5">
          <span className="h-1 w-9 rounded-full bg-border" />
          <div className="flex w-full items-center justify-between px-4">
            <span className="text-sm font-semibold">
              {count > 0 ? `${count} comment${count === 1 ? "" : "s"}` : "Comments"}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close comments"
              className="text-muted hover:text-foreground"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border px-4 py-4">
          {isLoading && data === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <CommentList
              comments={data?.comments ?? []}
              postId={postId}
              currentUserId={data?.currentUserId ?? null}
              onCommentPosted={refresh}
            />
          )}
        </div>

        <div className="flex-shrink-0 border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {isAuthenticated ? (
            <CommentForm postId={postId} onPosted={refresh} />
          ) : (
            <p className="text-sm text-muted">
              <Link href="/login" className="underline">
                Log in
              </Link>{" "}
              to comment.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
