"use client";

import { useState } from "react";
import Link from "next/link";
import { ReactionIcon, ReactionPicker } from "@/features/reactions/reaction-picker";
import { reactToCommentAction } from "@/features/reactions/actions";
import { topReactions, totalReactions, withMyReaction, type Reaction, type ReactionSummary } from "@/lib/reactions";

/**
 * A comment's reactions, at the end of its action row: the ones used,
 * most popular first, with a count, or a quiet "add a reaction" button
 * when there are none yet. Either opens the picker.
 */
export function CommentReactions({
  commentId,
  initial,
  canReact,
}: {
  commentId: string;
  initial: ReactionSummary;
  canReact: boolean;
}) {
  const [summary, setSummary] = useState(initial);
  const [open, setOpen] = useState(false);
  const top = topReactions(summary).slice(0, 3);
  const total = totalReactions(summary);

  async function pick(next: Reaction | null) {
    setOpen(false);
    const before = summary;
    setSummary(withMyReaction(summary, next));
    const result = await reactToCommentAction(commentId, next).catch(() => ({ ok: false }));
    if (!result.ok) setSummary(before);
  }

  const label = total > 0 ? `${total} ${total === 1 ? "reaction" : "reactions"}${summary.mine ? ", including yours" : ""}` : "React";
  const content =
    total > 0 ? (
      <span className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 transition-colors ${summary.mine ? "bg-foreground/[0.09]" : ""}`}>
        <span className="flex -space-x-1">
          {top.map((r) => (
            <ReactionIcon key={r} reaction={r} className="h-4 w-4 rounded-full ring-2 ring-surface" />
          ))}
        </span>
        <span className="numeral text-[0.75rem] font-semibold">{total}</span>
      </span>
    ) : (
      <ReactAddIcon />
    );

  return (
    <span className="relative ml-auto flex items-center">
      {canReact ? (
        <button type="button" onClick={() => setOpen(true)} aria-label={label} className="pressable flex items-center text-muted hover:text-foreground">
          {content}
        </button>
      ) : total > 0 ? (
        <Link href="/login" aria-label={label} className="flex items-center text-muted">
          {content}
        </Link>
      ) : null}
      {open && <ReactionPicker mine={summary.mine} onPick={(r) => void pick(r)} onClose={() => setOpen(false)} align="right" />}
    </span>
  );
}

/** A smile with a small plus: "add a reaction". */
function ReactAddIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden>
      <path d="M20.5 11.5a8.5 8.5 0 1 1-8-8.49" />
      <path d="M8.5 14.2c1.9 1.9 5.1 1.9 7 0" />
      <path d="M9 9.6h.01M14.5 9.6h.01" strokeWidth={2.4} />
      <path d="M19 2.5v5M16.5 5h5" />
    </svg>
  );
}
