"use client";

import { useState, useTransition } from "react";
import { deletePostAction } from "@/features/feed/actions";
import { MoreIcon } from "@/components/ui/icons";

/** The "..." trigger on a video the viewer owns — opens a small menu of
 * actions (just delete for now, structured so a second option slots in
 * next to it later without a rewrite). Replaces what used to be a bare
 * "Delete post" text link sitting directly on the video. */
export function VideoOptionsMenu({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Video options"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
      >
        <MoreIcon className="h-4.5 w-4.5" />
      </button>

      {open && (
        <>
          {/* Full-screen invisible backdrop so a tap anywhere outside the
              menu closes it, without needing a document-level listener. */}
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 top-10 z-20 min-w-40 overflow-hidden rounded-xl bg-black/85 py-1 text-white shadow-lg backdrop-blur-sm">
            {confirming ? (
              <div className="flex flex-col gap-2 px-3 py-2.5">
                <span className="text-sm text-danger">Delete this post?</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(() => deletePostAction(postId))}
                    className="text-sm font-medium text-danger disabled:opacity-60"
                  >
                    {isPending ? "Deleting…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setConfirming(false)}
                    className="text-sm text-white/70"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="w-full px-3.5 py-2.5 text-left text-sm text-danger hover:bg-white/10"
              >
                Delete post
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
