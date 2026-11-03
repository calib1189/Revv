"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CommentList, type CommentWithAuthor } from "@/features/feed/comment-list";
import { SheetComposer, type SheetComposerHandle } from "@/features/feed/sheet-composer";
import { listCommentsForSheetAction, type CommentSheetData } from "@/features/feed/actions";
import { CloseIcon } from "@/components/ui/icons";
import { useHideBottomNav } from "@/lib/ui/use-hide-bottom-nav";
import { useVisualViewportBox } from "@/lib/ui/use-visual-viewport";

/** Fraction of the sheet's own height a drag has to cross before
 * releasing counts as "close it" rather than "snap back open". */
const CLOSE_THRESHOLD = 0.25;
/** The sheet's resting top edge, as a fraction of the screen — matches
 * its 72% height, and is kept where it is when the keyboard comes up. */
const SHEET_TOP_FRACTION = 0.28;
/** Less than this much of the screen lost to the visible area isn't a
 * keyboard (a browser toolbar shifting, say). */
const KEYBOARD_MIN_PX = 120;

const subscribeNever = () => () => {};

export function CommentSheet({
  postId,
  isOpen,
  onClose,
  isAuthenticated,
  initialCount,
  onCountChange,
}: {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  initialCount: number;
  /** Keeps the count on the feed's comment button in step with what this
   * sheet actually loaded and posted. */
  onCountChange?: (count: number) => void;
}) {
  const [data, setData] = useState<CommentSheetData | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle");
  const [count, setCount] = useState(initialCount);
  const [replyTarget, setReplyTarget] = useState<CommentWithAuthor | null>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<SheetComposerHandle>(null);
  const dragStartYRef = useRef<number | null>(null);
  // Portalled, so only once there's a document to portal into.
  const isClient = useSyncExternalStore(subscribeNever, () => true, () => false);
  const viewport = useVisualViewportBox(isOpen);
  useHideBottomNav(isOpen);

  function handleDragStart(e: React.PointerEvent<HTMLDivElement>) {
    // The close button sits in this header. Capturing the pointer for a
    // press that started on it retargets the tap's click to the header,
    // and the X never fired.
    if ((e.target as HTMLElement).closest("button")) return;
    dragStartYRef.current = e.clientY;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDragMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartYRef.current === null) return;
    // Only downward drags move the sheet.
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
    if (data === null) setLoadState("loading");
    try {
      const next = await listCommentsForSheetAction(postId);
      setData(next);
      setCount(next.comments.length);
      onCountChange?.(next.comments.length);
      setLoadState("idle");
    } catch {
      setLoadState("error");
    }
  }

  useEffect(() => {
    if (isOpen && data === null) {
      void Promise.resolve().then(() => refresh());
    }
    if (!isOpen) {
      void Promise.resolve().then(() => setReplyTarget(null));
      // Closing with the keyboard up would otherwise leave it hanging over
      // the feed, typing into a sheet that's no longer there.
      composerRef.current?.blur();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // With the keyboard up the sheet keeps its top edge where it was and
  // ends right on top of the keyboard, so the composer sits on it — the
  // list in between gets shorter, the way TikTok's does.
  const keyboardOpen = viewport !== null && viewport.layoutHeight - viewport.height > KEYBOARD_MIN_PX;
  const sheetStyle: React.CSSProperties = {
    ...(keyboardOpen
      ? {
          height: Math.max(
            viewport.height - viewport.layoutHeight * SHEET_TOP_FRACTION,
            viewport.height * 0.5,
          ),
        }
      : {}),
    ...(isDragging ? { transform: `translateY(${dragY}px)` } : {}),
  };

  if (!isClient) return null;

  // Portalled to <body>: inside the feed slide the sheet stopped at the
  // top of the tab bar, and the bar showed below it. Out here it reaches
  // the bottom of the screen while the bar slides away (useHideBottomNav).
  // The wrapper is the visible area above the keyboard — see
  // useVisualViewportBox for why that's needed on iOS.
  return createPortal(
    <div
      data-no-edge-swipe
      className="pointer-events-none fixed inset-x-0 z-[75]"
      style={viewport ? { top: viewport.top, height: viewport.height } : { top: 0, bottom: 0 }}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-black/35 transition-opacity duration-300 ${
          isOpen ? "pointer-events-auto opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-label="Comments"
        aria-hidden={!isOpen}
        style={sheetStyle}
        className={`pointer-events-auto absolute inset-x-0 bottom-0 flex h-[72%] flex-col overflow-hidden rounded-t-[22px] bg-surface shadow-[0_-12px_40px_-12px_rgb(0_0_0/0.6)] ${
          isDragging ? "" : "transition-[transform,translate,height] duration-[420ms] ease-[var(--ease-ios)]"
        } ${isOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Drag this header down to close — scoped to the header, not
              the whole sheet, so it doesn't fight the list's own scroll. */}
          <div
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            className="relative flex flex-shrink-0 touch-none flex-col items-center pb-3 pt-2"
          >
            <span className="h-1 w-9 rounded-full bg-foreground/15" />
            <p className="mt-3 text-[0.875rem] font-semibold">
              {count > 0 ? (
                <>
                  <span className="numeral">{count}</span> {count === 1 ? "comment" : "comments"}
                </>
              ) : (
                "Comments"
              )}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close comments"
              className="absolute right-3 top-3.5 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-foreground"
            >
              <CloseIcon className="h-[18px] w-[18px]" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-1">
            {data === null && loadState !== "error" && <CommentSkeleton />}
            {loadState === "error" && data === null && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-[0.9375rem] font-semibold">Comments didn&apos;t load</p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="pressable h-9 rounded-full bg-foreground/[0.08] px-4 text-[0.875rem] font-semibold"
                >
                  Try again
                </button>
              </div>
            )}
            {data !== null && (
              <CommentList
                comments={data.comments}
                postId={postId}
                currentUserId={data.currentUserId}
                onCommentPosted={refresh}
                onReplyRequested={(comment) => {
                  setReplyTarget(comment);
                  // Right here, inside the Reply tap — the only moment
                  // iOS will raise the keyboard for a focus() call.
                  composerRef.current?.focus();
                }}
              />
            )}
          </div>

          {/* While typing, the comments dim behind the composer and a tap
              on them puts the keyboard away — TikTok's compose state. */}
          {composerFocused && (
            <div
              aria-hidden="true"
              className="animate-fade-in absolute inset-0 z-10 bg-black/45"
              onPointerDown={(e) => {
                e.preventDefault();
                composerRef.current?.blur();
              }}
            />
          )}
        </div>

        <div
          className={`flex-shrink-0 border-t border-border/60 bg-surface px-3 pt-2.5 ${
            keyboardOpen ? "pb-2.5" : "pb-[calc(0.625rem+env(safe-area-inset-bottom))]"
          }`}
        >
          {isAuthenticated ? (
            <SheetComposer
              ref={composerRef}
              postId={postId}
              replyTo={replyTarget ? { id: replyTarget.id, username: replyTarget.authorUsername } : null}
              onCancelReply={() => setReplyTarget(null)}
              onFocusChange={setComposerFocused}
              onPosted={() => {
                setReplyTarget(null);
                void refresh();
              }}
            />
          ) : (
            <Link
              href="/login"
              className="flex h-11 items-center rounded-full bg-foreground/[0.06] px-4 text-[0.9375rem] text-muted"
            >
              Log in to comment
            </Link>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CommentSkeleton() {
  return (
    <ul aria-hidden className="flex flex-col gap-6 pt-1">
      {[0.7, 0.45, 0.85, 0.55].map((w, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="animate-skeleton h-9 w-9 flex-shrink-0 rounded-full bg-foreground/[0.08]" />
          <span className="flex flex-1 flex-col gap-2 pt-0.5">
            <span className="animate-skeleton h-3 w-24 rounded-full bg-foreground/[0.08]" />
            <span className="animate-skeleton h-3.5 rounded-full bg-foreground/[0.06]" style={{ width: `${w * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
