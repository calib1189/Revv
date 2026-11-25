"use client";

import {
  forwardRef,
  startTransition,
  useActionState,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createSheetCommentAction, type CommentFormState } from "@/features/feed/actions";
import { Callout } from "@/components/ui/callout";
import { ArrowUpIcon, CloseIcon, GalleryIcon } from "@/components/ui/icons";
import { Avatar } from "@/features/feed/avatar";
import { GifButton, GifPicker } from "@/features/gifs/gif-picker";
import { useCommentPhoto } from "@/features/feed/use-comment-photo";
import type { GifRef } from "@/lib/gifs";

const initialState: CommentFormState = { error: null };
/** About five lines — past that the box scrolls instead of growing. */
const MAX_FIELD_HEIGHT_PX = 128;

export interface SheetComposerHandle {
  focus: () => void;
  blur: () => void;
}

/** Keeps a tap on a button from taking focus off the field — without it,
 * tapping send dismissed the keyboard first, the composer collapsed, and
 * the tap landed on whatever moved under the finger. */
function keepFieldFocused(e: React.SyntheticEvent) {
  e.preventDefault();
}

/**
 * The comment sheet's composer: your avatar, then one rounded box that
 * grows with what you type (up to about five lines), with a photo button,
 * a GIF button and send tucked inside it. It sits right on top of the
 * keyboard with nothing in between.
 *
 * A photo shows at once as a thumbnail above the box and uploads in the
 * background while you write (or don't write) a caption. A GIF posts the
 * moment you pick it, the way Instagram's and iMessage's do.
 *
 * It's one textarea throughout, and replies use the same one (the reply
 * target rides along as a hidden field rather than a remounted form) —
 * iOS only raises the keyboard for a focus() made inside the tap itself,
 * so a field swapped in after "Reply" could never bring it up.
 */
export const SheetComposer = forwardRef<
  SheetComposerHandle,
  {
    postId: string;
    replyTo: { id: string; username: string } | null;
    onCancelReply: () => void;
    onPosted: () => void;
    onFocusChange: (focused: boolean) => void;
    /** The viewer, shown beside the box. */
    me?: { username: string; avatarUrl: string | null } | null;
    /** The viewer's id, for uploading a photo. */
    userId?: string | null;
    /** Told when the GIF panel opens or closes, so the sheet can make room. */
    onGifOpenChange?: (open: boolean) => void;
  }
>(function SheetComposer(
  { postId, replyTo, onCancelReply, onPosted, onFocusChange, me, userId = null, onGifOpenChange },
  ref,
) {
  const [state, formAction, isPending] = useActionState(
    (prev: CommentFormState, formData: FormData) =>
      createSheetCommentAction(postId, String(formData.get("parentId") ?? "") || null, prev, formData),
    initialState,
  );
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [gifOpen, setGifOpenState] = useState(false);
  const photo = useCommentPhoto(userId);
  const formRef = useRef<HTMLFormElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const wasPending = useRef(false);

  useImperativeHandle(ref, () => ({
    focus: () => fieldRef.current?.focus(),
    blur: () => fieldRef.current?.blur(),
  }));

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      // Cleared from the effect that sees the finished request, not on
      // submit — clearing on submit would empty the field before the
      // action had read it. The keyboard goes with it, as TikTok's does.
      void Promise.resolve().then(() => {
        setText("");
        photo.clear();
      });
      fieldRef.current?.blur();
      onPosted();
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state.error]);

  // Grows with the text; a single line while empty.
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, MAX_FIELD_HEIGHT_PX)}px`;
  }, [text, focused]);

  const photoState = photo.state;
  const photoReady = photoState.status === "ready";
  const photoBusy = photoState.status === "uploading";
  const canSend = !isPending && !photoBusy && photoState.status !== "error" && (text.trim().length > 0 || photoReady);
  const placeholder = replyTo
    ? `Reply to @${replyTo.username}…`
    : photoState.status !== "empty"
      ? "Add a caption…"
      : "Add a comment…";

  function setGifOpen(next: boolean) {
    setGifOpenState(next);
    onGifOpenChange?.(next);
  }

  function setFocus(next: boolean) {
    setFocused(next);
    onFocusChange(next);
    if (next && gifOpen) setGifOpen(false);
  }

  function postGif(gif: GifRef) {
    const fd = new FormData();
    fd.set("gif_id", gif.id);
    fd.set("gif_width", String(gif.width));
    fd.set("gif_height", String(gif.height));
    fd.set("parentId", replyTo?.id ?? "");
    setGifOpen(false);
    startTransition(() => formAction(fd));
  }

  const sendIcon = isPending ? (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  ) : (
    <ArrowUpIcon className="h-4 w-4" strokeWidth={2.5} />
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      {state.error && <Callout tone="danger">{state.error}</Callout>}
      {gifOpen && <GifPicker onPick={postGif} onClose={() => setGifOpen(false)} disabled={isPending} />}
      {replyTo && (
        <div className="flex items-center justify-between px-1 text-[0.8125rem] text-muted">
          <span className="truncate">
            Replying to <span className="font-semibold text-foreground">@{replyTo.username}</span>
          </span>
          <button
            type="button"
            onPointerDown={keepFieldFocused}
            onMouseDown={keepFieldFocused}
            onClick={onCancelReply}
            aria-label="Cancel reply"
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {photoState.status !== "empty" && (
        <div className="animate-rise-in flex items-end gap-3 pl-[44px]">
          <span className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-[14px] bg-foreground/[0.08]">
            {photoState.previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- a local preview of the picked file
              <img src={photoState.previewUrl} alt="" className="h-full w-full object-cover" />
            )}
            {photoBusy && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </span>
            )}
            <button
              type="button"
              onPointerDown={keepFieldFocused}
              onMouseDown={keepFieldFocused}
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
      <input type="hidden" name="parentId" value={replyTo?.id ?? ""} />
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

      <div className="flex items-end gap-2.5">
        {me && <Avatar username={me.username} avatarUrl={me.avatarUrl} className="mb-[3px] h-[34px] w-[34px] text-xs" />}
        <div
          className={`flex min-w-0 flex-1 items-end gap-0.5 rounded-[20px] bg-foreground/[0.07] py-1 pl-3.5 pr-1 ring-1 transition-[box-shadow,background-color] duration-200 ${
            focused ? "bg-foreground/[0.09] ring-foreground/10" : "ring-transparent"
          }`}
        >
          <textarea
            ref={fieldRef}
            name="body"
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            onKeyDown={(e) => {
              // Return sends, like the keyboard's send key promises; shift
              // still breaks a line on a hardware keyboard.
              if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
              e.preventDefault();
              if (canSend) formRef.current?.requestSubmit();
            }}
            placeholder={placeholder}
            maxLength={2000}
            autoComplete="off"
            enterKeyHint="send"
            aria-label={replyTo ? "Reply" : "Comment"}
            className="min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-[7px] text-[0.9375rem] leading-[1.35] text-foreground placeholder:text-muted/70 focus:outline-none"
          />
          {userId && (
            <button
              type="button"
              onPointerDown={keepFieldFocused}
              onMouseDown={keepFieldFocused}
              onClick={() => fileRef.current?.click()}
              aria-label="Add a photo"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground"
            >
              <GalleryIcon className="h-[19px] w-[19px]" />
            </button>
          )}
          {photoState.status === "empty" && <GifButton open={gifOpen} onClick={() => setGifOpen(!gifOpen)} />}
          {(focused || text || photoState.status !== "empty") && (
            <button
              type="submit"
              disabled={!canSend}
              onPointerDown={keepFieldFocused}
              onMouseDown={keepFieldFocused}
              aria-label={replyTo ? "Post reply" : "Post comment"}
              className={`pressable animate-fade-in flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                canSend ? "scale-100 bg-accent text-white" : "scale-90 bg-foreground/10 text-muted"
              }`}
            >
              {sendIcon}
            </button>
          )}
        </div>
      </div>
    </form>
  );
});
