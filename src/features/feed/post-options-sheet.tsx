"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePostAction, updateCaptionAction } from "@/features/feed/actions";
import { SITE_URL } from "@/lib/site-url";
import {
  MoreIcon,
  CloseIcon,
  ExternalLinkIcon,
  LinkIcon,
  ShareIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
} from "@/components/ui/icons";

const MAX_CAPTION_LENGTH = 2200;
/** Fraction of the sheet's own height a drag has to cross before
 * releasing counts as "close it" rather than "snap back open" — same
 * threshold comment-sheet.tsx uses. */
const CLOSE_THRESHOLD = 0.3;

type View = "menu" | "editCaption" | "confirmDelete";

/** The "..." trigger on a video the viewer owns. A real bottom sheet
 * (same drag-to-close pattern as comment-sheet.tsx) instead of the
 * small anchored dropdown this replaces, with four real actions instead
 * of just delete — every one backed by an already-real capability
 * (RLS already allowed an owner to update their own post's caption;
 * this is the first UI that actually uses it). */
export function PostOptionsSheet({
  postId,
  caption,
  onCaptionUpdated,
}: {
  postId: string;
  caption: string | null;
  onCaptionUpdated: (caption: string | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [draft, setDraft] = useState(caption ?? "");
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [isPending, startTransition] = useTransition();
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef<number | null>(null);

  function close() {
    setOpen(false);
    setView("menu");
    setCaptionError(null);
    setCopyStatus("idle");
  }

  function openSheet() {
    setDraft(caption ?? "");
    setOpen(true);
  }

  function handleDragStart(e: React.PointerEvent<HTMLDivElement>) {
    dragStartYRef.current = e.clientY;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDragMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartYRef.current === null) return;
    setDragY(Math.max(0, e.clientY - dragStartYRef.current));
  }

  function handleDragEnd() {
    if (dragStartYRef.current === null) return;
    dragStartYRef.current = null;
    const sheetHeight = sheetRef.current?.offsetHeight ?? 0;
    const shouldClose = sheetHeight > 0 && dragY > sheetHeight * CLOSE_THRESHOLD;
    setIsDragging(false);
    setDragY(0);
    if (shouldClose) close();
  }

  async function handleCopyLink() {
    const url = `${SITE_URL}/p/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    setTimeout(() => setCopyStatus("idle"), 1500);
  }

  async function handleShare() {
    const url = `${SITE_URL}/p/${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // Dismissed the native sheet — not an error.
      }
      close();
      return;
    }
    await handleCopyLink();
  }

  function handleGoToPost() {
    close();
    router.push(`/p/${postId}`);
  }

  function handleSaveCaption() {
    setCaptionError(null);
    startTransition(async () => {
      const result = await updateCaptionAction(postId, draft);
      if (result.error) {
        setCaptionError(result.error);
        return;
      }
      onCaptionUpdated(draft.trim() || null);
      close();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={openSheet}
        aria-label="Post options"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
      >
        <MoreIcon className="h-4.5 w-4.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
          />

          <div
            ref={sheetRef}
            role="dialog"
            aria-label="Post options"
            style={isDragging ? { transform: `translateY(${dragY}px)` } : undefined}
            className={`absolute inset-x-0 bottom-0 flex flex-col rounded-t-3xl border-t border-white/10 bg-[#111114] pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(0,0,0,0.5)] ${
              isDragging ? "" : "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            }`}
          >
            <div
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
              className="flex flex-shrink-0 touch-none flex-col items-center gap-3 pb-1 pt-2.5"
            >
              <span className="h-1 w-9 rounded-full bg-white/20" />
              {view === "menu" && (
                <div className="flex w-full items-center justify-between px-5">
                  <span className="text-sm font-semibold text-white">Post options</span>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="flex h-7 w-7 items-center justify-center text-white/60 hover:text-white"
                  >
                    <CloseIcon className="h-4.5 w-4.5" />
                  </button>
                </div>
              )}
            </div>

            {view === "menu" && (
              <div className="flex flex-col gap-1 px-3 pb-2 pt-2">
                <SheetRow icon={ExternalLinkIcon} label="Go to post" onClick={handleGoToPost} />
                <SheetRow
                  icon={LinkIcon}
                  label={
                    copyStatus === "copied" ? "Link copied" : copyStatus === "failed" ? "Couldn't copy" : "Copy link"
                  }
                  tone={copyStatus === "copied" ? "success" : copyStatus === "failed" ? "danger" : "default"}
                  onClick={handleCopyLink}
                />
                <SheetRow icon={ShareIcon} label="Share" onClick={handleShare} />
                <SheetRow icon={EditIcon} label="Edit caption" onClick={() => setView("editCaption")} />
                <div className="my-1 h-px bg-white/10" />
                <SheetRow
                  icon={TrashIcon}
                  label="Delete post"
                  tone="danger"
                  onClick={() => setView("confirmDelete")}
                />
              </div>
            )}

            {view === "editCaption" && (
              <div className="flex flex-col gap-3 px-5 pb-3 pt-1">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setView("menu")}
                    className="text-sm text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <span className="text-sm font-semibold text-white">Edit caption</span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleSaveCaption}
                    className="text-sm font-semibold text-accent disabled:opacity-50"
                  >
                    {isPending ? "Saving…" : "Save"}
                  </button>
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={MAX_CAPTION_LENGTH}
                  rows={4}
                  autoFocus
                  placeholder="Write a caption…"
                  className="glass-inset w-full resize-none rounded-2xl px-3.5 py-3 text-sm text-white placeholder:text-white/40"
                />
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{captionError}</span>
                  <span>
                    {draft.length}/{MAX_CAPTION_LENGTH}
                  </span>
                </div>
              </div>
            )}

            {view === "confirmDelete" && (
              <div className="flex flex-col gap-3 px-5 pb-3 pt-1">
                <p className="text-center text-sm text-white/80">
                  Delete this post? This can&apos;t be undone.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setView("menu")}
                    className="flex-1 rounded-full bg-white/10 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(() => deletePostAction(postId))}
                    className="flex-1 rounded-full bg-danger py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isPending ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SheetRow({
  icon: Icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: typeof MoreIcon;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger" | "success";
}) {
  const toneClass =
    tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left text-[0.95rem] font-medium transition-colors hover:bg-white/[0.06] active:bg-white/10 ${toneClass}`}
    >
      {tone === "success" ? <CheckIcon className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      {label}
    </button>
  );
}
