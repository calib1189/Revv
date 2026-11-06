"use client";

import {
  forwardRef,
  useActionState,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createCommentAction, type CommentFormState } from "@/features/feed/actions";
import { Callout } from "@/components/ui/callout";
import { ArrowUpIcon, CloseIcon } from "@/components/ui/icons";

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
 * The comment sheet's composer, laid out like TikTok's: a slim "Add a
 * comment…" pill while you read, and once focused a taller box that grows
 * with what you type, with the send button on its own row underneath.
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
  }
>(function SheetComposer({ postId, replyTo, onCancelReply, onPosted, onFocusChange }, ref) {
  const [state, formAction, isPending] = useActionState(
    (prev: CommentFormState, formData: FormData) =>
      createCommentAction(postId, String(formData.get("parentId") ?? "") || null, prev, formData),
    initialState,
  );
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
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
      void Promise.resolve().then(() => setText(""));
      fieldRef.current?.blur();
      onPosted();
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state.error]);

  // Grows with the text while focused; back to a single line when not.
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    if (!focused) {
      field.style.height = "";
      return;
    }
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, MAX_FIELD_HEIGHT_PX)}px`;
  }, [text, focused]);

  const canSend = text.trim().length > 0 && !isPending;
  const placeholder = replyTo ? `Reply to @${replyTo.username}…` : "Add a comment…";

  function setFocus(next: boolean) {
    setFocused(next);
    onFocusChange(next);
  }

  const sendIcon = isPending ? (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  ) : (
    <ArrowUpIcon className="h-4 w-4" strokeWidth={2.5} />
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      {state.error && <Callout tone="danger">{state.error}</Callout>}
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
      <input type="hidden" name="parentId" value={replyTo?.id ?? ""} />

      <div
        className={`flex bg-foreground/[0.06] ${
          focused ? "rounded-[18px] px-3.5 py-3" : "items-center gap-1 rounded-full py-1 pl-4 pr-1"
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
          className={`min-w-0 flex-1 resize-none bg-transparent text-[0.9375rem] leading-snug text-foreground placeholder:text-muted/60 focus:outline-none ${
            focused ? "min-h-[3.25rem]" : "h-8 overflow-hidden py-1.5"
          }`}
        />
        {!focused && (
          <button
            type="submit"
            disabled={!canSend}
            aria-label={replyTo ? "Post reply" : "Post comment"}
            className={`pressable flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
              canSend ? "scale-100 bg-accent text-white" : "scale-90 bg-foreground/10 text-muted"
            }`}
          >
            {sendIcon}
          </button>
        )}
      </div>

      {focused && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSend}
            onPointerDown={keepFieldFocused}
            onMouseDown={keepFieldFocused}
            aria-label={replyTo ? "Post reply" : "Post comment"}
            className={`pressable flex h-9 w-14 items-center justify-center rounded-full text-white transition-colors duration-200 ${
              canSend ? "bg-accent" : "bg-accent/35"
            }`}
          >
            {sendIcon}
          </button>
        </div>
      )}
    </form>
  );
});
