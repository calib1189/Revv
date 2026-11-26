"use client";

import { useEffect, useState } from "react";
import { deleteDraft, listDrafts, type PostDraft } from "@/lib/drafts/draft-store";
import { relativeTime } from "@/lib/format/relative-time";
import { useObjectUrl } from "@/features/editor/use-object-url";
import { CloseIcon, DraftsIcon, PlayIcon, TrashIcon } from "@/components/ui/icons";

/**
 * Drafts saved on this phone, newest first, as a grid of covers. Tapping
 * one opens it back up where it was left; the trash corner deletes it
 * (after asking, since a draft is the only copy of that edit).
 */
export function DraftsSheet({
  userId,
  onOpen,
  onClose,
}: {
  userId: string;
  onOpen: (draft: PostDraft) => void;
  onClose: () => void;
}) {
  const [drafts, setDrafts] = useState<PostDraft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<PostDraft | null>(null);

  useEffect(() => {
    let cancelled = false;
    listDrafts(userId)
      .then((list) => !cancelled && setDrafts(list))
      .catch(() => !cancelled && setError("Couldn't load your drafts."));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function remove(draft: PostDraft) {
    setConfirming(null);
    try {
      await deleteDraft(draft.id);
      setDrafts((list) => list?.filter((d) => d.id !== draft.id) ?? null);
    } catch {
      setError("Couldn't delete that draft. Try again.");
    }
  }

  return (
    <div className="animate-studio-in fixed inset-0 z-[70] flex flex-col bg-[#0c0c0d] text-white">
      <div className="grid flex-shrink-0 grid-cols-[2.75rem_1fr_2.75rem] items-center px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close drafts"
          className="pressable flex h-11 w-11 items-center justify-center rounded-full text-white"
        >
          <CloseIcon className="h-[22px] w-[22px]" />
        </button>
        <h1 className="text-center text-[1.0625rem] font-semibold tracking-[-0.01em]">
          Drafts{drafts && drafts.length > 0 ? <span className="numeral ml-1.5 text-white/45">{drafts.length}</span> : null}
        </h1>
        <span />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {error && (
          <p className="mx-1 mb-3 rounded-[14px] bg-[#2a1210] px-4 py-3 text-[0.875rem] text-[#ffb4a8] ring-1 ring-accent/30">
            {error}
          </p>
        )}

        {drafts === null && !error && (
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="aspect-[9/16] animate-pulse rounded-[12px] bg-white/[0.06]" />
            ))}
          </div>
        )}

        {drafts && drafts.length === 0 && (
          <div className="flex flex-col items-center px-8 pt-24 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.07] text-white/70">
              <DraftsIcon className="h-7 w-7" />
            </span>
            <p className="mt-5 text-[1.0625rem] font-semibold">No drafts yet</p>
            <p className="mt-1.5 max-w-[30ch] text-[0.875rem] leading-relaxed text-white/55">
              Tap Drafts on the post screen to save a post here and finish it later.
            </p>
          </div>
        )}

        {drafts && drafts.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              {drafts.map((draft, i) => (
                <DraftTile
                  key={draft.id}
                  draft={draft}
                  delayMs={Math.min(i, 8) * 35}
                  onOpen={() => onOpen(draft)}
                  onDelete={() => setConfirming(draft)}
                />
              ))}
            </div>
            <p className="mt-5 text-center text-[0.75rem] text-white/40">Drafts are saved on this phone only.</p>
          </>
        )}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-[75] flex items-end bg-black/55" onClick={() => setConfirming(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-rise-in w-full rounded-t-[26px] bg-[#161618] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 text-center"
          >
            <p className="text-[1.0625rem] font-semibold">Delete this draft?</p>
            <p className="mt-1 text-[0.875rem] text-white/55">Its edit can&apos;t be recovered.</p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => remove(confirming)}
                className="pressable h-12 rounded-full bg-accent text-[0.9375rem] font-semibold text-white"
              >
                Delete draft
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="pressable h-12 rounded-full bg-white/[0.08] text-[0.9375rem] font-semibold text-white"
              >
                Keep it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DraftTile({
  draft,
  delayMs,
  onOpen,
  onDelete,
}: {
  draft: PostDraft;
  delayMs: number;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="animate-rise-in relative aspect-[9/16] overflow-hidden rounded-[12px] bg-white/[0.06]" style={{ animationDelay: `${delayMs}ms` }}>
      <button type="button" onClick={onOpen} aria-label="Open draft" className="pressable absolute inset-0">
        {draft.cover && <DraftCover blob={draft.cover} />}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute bottom-2 left-2 right-2 flex items-center gap-1 text-left text-[0.6875rem] font-semibold text-white">
          {draft.kind === "video" && <PlayIcon className="h-3 w-3 flex-shrink-0" />}
          <span className="truncate">{relativeTime(new Date(draft.updatedAt).toISOString())}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete draft"
        className="pressable absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md"
      >
        <TrashIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function DraftCover({ blob }: { blob: Blob }) {
  const url = useObjectUrl(blob);
  // eslint-disable-next-line @next/next/no-img-element -- a local blob: still from this phone
  return <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />;
}
