"use client";

import { REACTIONS, REACTION_LABELS, type Reaction } from "@/lib/reactions";

/** The six reactions, drawn in the app's own style (not emoji). */
export function ReactionIcon({ reaction, className = "h-6 w-6" }: { reaction: Reaction; className?: string }) {
  switch (reaction) {
    case "heart":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="#ff375f" d="M12 21s-7.5-4.6-10-9.3C.5 8.3 2.3 5 5.7 4.5A5 5 0 0 1 12 7.7a5 5 0 0 1 6.3-3.2c3.4.5 5.2 3.8 3.7 7.2C19.5 16.4 12 21 12 21Z" />
        </svg>
      );
    case "fire":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="#ff7a1a" d="M12.3 2.2c.4 3.1-1.3 4.8-2.9 6.6C7.6 10.8 6 12.7 6 15.5 6 19 8.7 22 12 22s6-3 6-6.6c0-2.9-1.4-4.7-2.6-6.2-.3 1.6-1 2.6-2 3.1.6-3.7-.3-7.3-1.1-10.1Z" />
          <path fill="#ffd60a" d="M12 22c-1.9 0-3.3-1.5-3.3-3.4 0-1.6.9-2.6 1.8-3.6.6-.7 1.2-1.4 1.4-2.4 1.4 1.3 3.4 3 3.4 5.9 0 1.9-1.4 3.5-3.3 3.5Z" />
        </svg>
      );
    case "up":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="#0a84ff" d="M2.5 10.5h3.2v10H2.5a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5Zm5.2 0 3.8-7.3c.3-.5.9-.7 1.4-.5 1.4.6 2.1 2.1 1.7 3.6l-.8 3h5.1a2.2 2.2 0 0 1 2.2 2.7l-1.6 7.3a2.2 2.2 0 0 1-2.2 1.7H7.7V10.5Z" />
        </svg>
      );
    default: {
      // The faces: laugh, wow, sad.
      const mouth =
        reaction === "laugh" ? (
          <path fill="#2b1d00" d="M7 13.2h10a5 5 0 0 1-10 0Z" />
        ) : reaction === "wow" ? (
          <ellipse fill="#2b1d00" cx="12" cy="15.6" rx="2.2" ry="2.8" />
        ) : (
          <path fill="none" stroke="#2b1d00" strokeWidth={1.7} strokeLinecap="round" d="M8.6 17.2c1.9-2 4.9-2 6.8 0" />
        );
      const eyes =
        reaction === "laugh" ? (
          <path fill="none" stroke="#2b1d00" strokeWidth={1.7} strokeLinecap="round" d="M7.2 9.8c.8-1.2 2.2-1.2 3 0M13.8 9.8c.8-1.2 2.2-1.2 3 0" />
        ) : (
          <>
            <ellipse fill="#2b1d00" cx="8.9" cy="9.6" rx="1.2" ry={reaction === "wow" ? 1.6 : 1.3} />
            <ellipse fill="#2b1d00" cx="15.1" cy="9.6" rx="1.2" ry={reaction === "wow" ? 1.6 : 1.3} />
          </>
        );
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#ffcc33" />
          {eyes}
          {mouth}
          {reaction === "sad" && <path fill="#5ac8fa" d="M17.4 11.6c.7 1 1.1 1.7 1.1 2.2a1.1 1.1 0 0 1-2.2 0c0-.5.4-1.2 1.1-2.2Z" />}
        </svg>
      );
    }
  }
}

/**
 * The row of reactions that pops up over a message or comment. Tapping
 * your current reaction again takes it back. Tapping anywhere else
 * closes it.
 */
export function ReactionPicker({
  mine,
  onPick,
  onClose,
  align = "center",
  placement = "above",
  onCopy,
}: {
  mine: Reaction | null;
  onPick: (reaction: Reaction | null) => void;
  onClose: () => void;
  align?: "left" | "right" | "center";
  placement?: "above" | "below";
  /** Offers Copy under the reactions (a DM's text can't be selected,
   * since holding it opens this). */
  onCopy?: () => void;
}) {
  const x = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  const y = placement === "above" ? "bottom-full mb-2" : "top-full mt-2";
  return (
    <>
      <div
        className="fixed inset-0 z-[90]"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        aria-hidden
      />
      <div
        role="menu"
        aria-label="React"
        className={`animate-reaction-pop absolute z-[91] flex items-center gap-0.5 rounded-full bg-surface-raised p-1 shadow-[0_10px_30px_rgb(0_0_0/0.45)] ring-1 ring-border ${x} ${y}`}
      >
        {REACTIONS.map((r, i) => (
          <button
            key={r}
            type="button"
            role="menuitemradio"
            aria-checked={mine === r}
            aria-label={REACTION_LABELS[r]}
            onClick={(e) => {
              e.stopPropagation();
              onPick(mine === r ? null : r);
            }}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 active:scale-95 ${
              mine === r ? "bg-foreground/[0.12]" : ""
            }`}
            style={{ animationDelay: `${i * 25}ms` }}
          >
            <ReactionIcon reaction={r} className="h-7 w-7" />
          </button>
        ))}
      </div>
      {onCopy && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
            onClose();
          }}
          className={`animate-reaction-pop absolute z-[91] rounded-full bg-surface-raised px-4 py-2 text-[0.875rem] font-semibold shadow-[0_10px_30px_rgb(0_0_0/0.45)] ring-1 ring-border ${x} ${
            placement === "above" ? "top-full mt-2" : "bottom-full mb-2"
          }`}
        >
          Copy
        </button>
      )}
    </>
  );
}
