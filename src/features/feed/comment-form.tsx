"use client";

import { useActionState, useRef, useEffect, useState, startTransition } from "react";
import {
  createCommentAction,
  type CommentFormState,
} from "@/features/feed/actions";
import { Callout } from "@/components/ui/callout";
import { GifButton, GifPicker } from "@/features/gifs/gif-picker";
import type { GifRef } from "@/lib/gifs";
import { ArrowUpIcon, CloseIcon, GalleryIcon } from "@/components/ui/icons";
import { useCommentPhoto } from "@/features/feed/use-comment-photo";

const initialState: CommentFormState = { error: null };

export function CommentForm({
  postId,
  parentId = null,
  autoFocus = false,
  onPosted,
  replyingTo = null,
  onCancelReply,
  userId = null,
}: {
  postId: string;
  /** Set when this form is a reply to a specific top-level comment,
   * rather than a new top-level comment on the post. */
  parentId?: string | null;
  autoFocus?: boolean;
  /** Called after a successful post — the feed's comment sheet uses this
   * to refresh its own list without a full page revalidation. */
  onPosted?: () => void;
  /** Shown above the field as "Replying to @name", with a way out. */
  replyingTo?: string | null;
  onCancelReply?: () => void;
  /** The viewer's id, for adding a photo. Without it there's no photo button. */
  userId?: string | null;
}) {
  const action = createCommentAction.bind(null, postId, parentId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [text, setText] = useState("");
  const [gifOpen, setGifOpen] = useState(false);
  const photo = useCommentPhoto(userId);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      formRef.current?.reset();
      // Cleared from the effect that observes the finished request, not
      // from the submit handler — clearing on submit would empty the
      // field before the action had read it.
      void Promise.resolve().then(() => {
        setText("");
        photo.clear();
      });
      onPosted?.();
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state.error]);

  useEffect(() => {
    if (!autoFocus) return;
    // Next frame, so iOS raises the keyboard for a field that's laid out.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [autoFocus]);

  const photoState = photo.state;
  const photoReady = photoState.status === "ready";
  const canSend =
    !isPending && photoState.status !== "uploading" && photoState.status !== "error" && (text.trim().length > 0 || photoReady);

  function postGif(gif: GifRef) {
    const fd = new FormData();
    fd.set("gif_id", gif.id);
    fd.set("gif_width", String(gif.width));
    fd.set("gif_height", String(gif.height));
    setGifOpen(false);
    startTransition(() => formAction(fd));
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      {state.error && <Callout tone="danger">{state.error}</Callout>}
      {replyingTo && (
        <div className="flex items-center justify-between px-1 text-[0.8125rem] text-muted">
          <span className="truncate">
            Replying to <span className="font-semibold text-foreground">@{replyingTo}</span>
          </span>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              aria-label="Cancel reply"
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
      {gifOpen && <GifPicker onPick={postGif} onClose={() => setGifOpen(false)} disabled={isPending} />}
      {photoState.status !== "empty" && (
        <div className="animate-rise-in flex items-end gap-3 px-1">
          <span className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-[14px] bg-foreground/[0.08]">
            {photoState.previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- a local preview of the picked file
              <img src={photoState.previewUrl} alt="" className="h-full w-full object-cover" />
            )}
            {photoState.status === "uploading" && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </span>
            )}
            <button
              type="button"
              onClick={() => photo.clear()}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-sm"
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          </span>
          {photoState.status === "error" && <p className="pb-1 text-[0.8125rem] text-danger">{photoState.message}</p>}
        </div>
      )}
      <input type="hidden" name="media_id" value={photoReady ? photoState.mediaId : ""} />
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void photo.pick(file);
        }}
      />
      <div className="flex items-center gap-1 rounded-full bg-foreground/[0.06] py-1 pl-4 pr-1 transition-[box-shadow,background-color] focus-within:bg-foreground/[0.08] focus-within:ring-2 focus-within:ring-accent/25">
        <input
          ref={inputRef}
          name="body"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setGifOpen(false)}
          placeholder={parentId ? "Add a reply…" : photoState.status !== "empty" ? "Add a caption…" : "Add a comment…"}
          maxLength={2000}
          autoComplete="off"
          enterKeyHint="send"
          aria-label={parentId ? "Reply" : "Comment"}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[0.9375rem] text-foreground placeholder:text-muted/60 focus:outline-none"
        />
        {userId && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Add a photo"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground"
          >
            <GalleryIcon className="h-[19px] w-[19px]" />
          </button>
        )}
        {photoState.status === "empty" && <GifButton open={gifOpen} onClick={() => setGifOpen((o) => !o)} />}
        <button
          type="submit"
          disabled={!canSend}
          aria-label={parentId ? "Post reply" : "Post comment"}
          className={`pressable flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
            canSend ? "scale-100 bg-accent text-white" : "scale-90 bg-foreground/10 text-muted"
          }`}
        >
          {isPending ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <ArrowUpIcon className="h-4 w-4" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </form>
  );
}
