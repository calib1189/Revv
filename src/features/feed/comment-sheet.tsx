"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CommentList } from "@/features/feed/comment-list";
import { CommentForm } from "@/features/feed/comment-form";
import { listCommentsForSheetAction, type CommentSheetData } from "@/features/feed/actions";
import { CloseIcon } from "@/components/ui/icons";

/** Fraction of the sheet's own height a drag has to cross before
 * releasing counts as "close it" rather than "snap back open". */
const CLOSE_THRESHOLD = 0.3;

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
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef<number | null>(null);

  function handleDragStart(e: React.PointerEvent<HTMLDivElement>) {
    dragStartYRef.current = e.clientY;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDragMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartYRef.current === null) return;
    // Only drags downward move the sheet — dragging up just does nothing
    // rather than letting it overshoot past fully open.
    setDragY(Math.max(0, e.clientY - dragStartYRef.current));
  }

  function handleDragEnd() {
    if (dragStartYRef.current === null) return;
    dragStartYRef.current = null;
    const sheetHeight = sheetRef.current?.offsetHeight ?? 0;
    const shouldClose = sheetHeight > 0 && dragY > sheetHeight * CLOSE_THRESHOLD;
    setIsDragging(false);
    setDragY(0);
    if (shouldClose) onClose();
  }

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
        ref={sheetRef}
        role="dialog"
        aria-label="Comments"
        style={isDragging ? { transform: `translateY(${dragY}px)` } : undefined}
        className={`absolute inset-x-0 bottom-0 z-30 flex h-[65%] flex-col rounded-t-2xl border-t border-white/10 bg-surface ${
          isDragging ? "" : "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        } ${isOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* Drag this header (handle bar + title row) down to close —
            same gesture a native iOS sheet uses. Scoped to the header,
            not the whole sheet, so it doesn't fight with the comment
            list's own vertical scroll below it. */}
        <div
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          className="flex flex-shrink-0 touch-none flex-col items-center gap-2 pb-2 pt-2.5"
        >
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
