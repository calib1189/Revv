"use client";

import { useRef, useState } from "react";
import { ReactionIcon, ReactionPicker } from "@/features/reactions/reaction-picker";
import { reactToMessageAction } from "@/features/reactions/actions";
import { topReactions, totalReactions, withMyReaction, type Reaction, type ReactionSummary } from "@/lib/reactions";

const HOLD_MS = 380;
const DOUBLE_TAP_MS = 280;

/**
 * A DM bubble you can react to: hold it (or double-tap) for the
 * reactions, the way iMessage's tapbacks work. Reactions sit on the
 * bubble's top corner, on the side toward the middle of the screen.
 */
export function ReactableMessage({
  messageId,
  isMine,
  initial,
  text,
  children,
}: {
  messageId: string;
  isMine: boolean;
  initial: ReactionSummary;
  /** The message, for Copy. */
  text: string;
  children: React.ReactNode;
}) {
  const [summary, setSummary] = useState(initial);
  const [open, setOpen] = useState(false);
  const hold = useRef<number>(0);
  const lastTap = useRef(0);
  const start = useRef({ x: 0, y: 0 });

  async function pick(next: Reaction | null) {
    setOpen(false);
    const before = summary;
    setSummary(withMyReaction(summary, next));
    const result = await reactToMessageAction(messageId, next).catch(() => ({ ok: false }));
    if (!result.ok) setSummary(before);
  }

  const top = topReactions(summary).slice(0, 2);
  const total = totalReactions(summary);

  return (
    <div
      className={`relative ${total > 0 ? "mt-3" : ""}`}
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
        hold.current = window.setTimeout(() => setOpen(true), HOLD_MS);
      }}
      onPointerMove={(e) => {
        if (Math.abs(e.clientX - start.current.x) + Math.abs(e.clientY - start.current.y) > 8) window.clearTimeout(hold.current);
      }}
      onPointerUp={() => {
        window.clearTimeout(hold.current);
        const now = Date.now();
        if (now - lastTap.current < DOUBLE_TAP_MS) {
          lastTap.current = 0;
          setOpen(true);
        } else lastTap.current = now;
      }}
      onPointerCancel={() => window.clearTimeout(hold.current)}
      onContextMenu={(e) => {
        e.preventDefault();
        setOpen(true);
      }}
      style={{ WebkitTouchCallout: "none" }}
    >
      {children}
      {total > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${total} ${total === 1 ? "reaction" : "reactions"}`}
          className={`animate-reaction-pop absolute -top-3 flex items-center rounded-full bg-surface-raised px-1 py-0.5 ring-2 ring-background ${isMine ? "-left-2" : "-right-2"}`}
        >
          {top.map((r) => (
            <ReactionIcon key={r} reaction={r} className="h-[18px] w-[18px]" />
          ))}
          {total > 2 && <span className="numeral px-0.5 text-[0.6875rem] font-semibold text-muted">{total}</span>}
        </button>
      )}
      {open && (
        <ReactionPicker
          mine={summary.mine}
          onPick={(r) => void pick(r)}
          onClose={() => setOpen(false)}
          align={isMine ? "right" : "left"}
          onCopy={() => void navigator.clipboard?.writeText(text).catch(() => {})}
        />
      )}
    </div>
  );
}
