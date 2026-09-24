"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePostAction, updateCaptionAction } from "@/features/feed/actions";
import { ReportButton } from "@/features/feed/report-button";
import { SITE_URL } from "@/lib/site-url";
import {
  CloseIcon,
  ExternalLinkIcon,
  LinkIcon,
  ShareIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  VolumeIcon,
  FlagIcon,
} from "@/components/ui/icons";

const MAX_CAPTION_LENGTH = 2200;
/** Fraction of the sheet's own height a drag has to cross before
 * releasing counts as "close it" rather than "snap back open" — same
 * threshold comment-sheet.tsx uses. */
const CLOSE_THRESHOLD = 0.3;

type View = "menu" | "editCaption" | "confirmDelete" | "report";

/** The single bottom sheet for everything you can do to a post from the
 * feed — opened by a long press on its media (swipe-slide.tsx), not a
 * persistent "..." button or a separate always-visible mute icon; both
 * of those used to sit on top of the media itself and this replaces
 * both. Same drag-to-close pattern as comment-sheet.tsx. Mute and Report
 * are universal (any viewer, any post); Edit caption and Delete only
 * make sense — and only render — for a post the viewer owns. */
export function PostContextMenu({
  open,
  onClose,
  postId,
  caption,
  onCaptionUpdated,
  isOwnPost,
  canReport,
  showMuteToggle,
  isMuted,
  onToggleMute,
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
  caption: string | null;
  onCaptionUpdated: (caption: string | null) => void;
  isOwnPost: boolean;
  /** Reporting your own post isn't a real option, and it's hidden for a
   * logged-out viewer rather than sending them into a report flow that
   * would just fail server-side. */
  canReport: boolean;
  /** Only a video post has its own native audio track to mute — a photo
   * post's attached background sound has its own separate, already-
   * visible mute control (see PhotoMedia), which this doesn't touch. */
  showMuteToggle: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}) {
  const router = useRouter();
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
    onClose();
    setView("menu");
    setCaptionError(null);
    setCopyStatus("idle");
  }

  function openEditCaption() {
    setDraft(caption ?? "");
    setView("editCaption");
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

  if (!open) return null;

  return (
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
            {showMuteToggle && (
              <SheetRow
                icon={(props) => <VolumeIcon muted={isMuted} {...props} />}
                label={isMuted ? "Unmute" : "Mute"}
                onClick={onToggleMute}
              />
            )}
            {canReport && (
              <SheetRow icon={FlagIcon} label="Report" onClick={() => setView("report")} />
            )}
            {(showMuteToggle || canReport) && <div className="my-1 h-px bg-white/10" />}
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
            {isOwnPost && (
              <>
                <SheetRow icon={EditIcon} label="Edit caption" onClick={openEditCaption} />
                <div className="my-1 h-px bg-white/10" />
                <SheetRow
                  icon={TrashIcon}
                  label="Delete post"
                  tone="danger"
                  onClick={() => setView("confirmDelete")}
                />
              </>
            )}
          </div>
        )}

        {view === "report" && (
          <div className="flex flex-col gap-3 px-5 pb-3 pt-1">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setView("menu")}
                className="text-sm text-white/60 hover:text-white"
              >
                Back
              </button>
              <span className="text-sm font-semibold text-white">Report post</span>
              <span className="w-9" />
            </div>
            <ReportButton targetType="post" targetId={postId} defaultOpen />
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
  );
}

function SheetRow({
  icon: Icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: (props: { className?: string }) => React.ReactNode;
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
