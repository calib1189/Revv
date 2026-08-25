"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleSaveAction } from "@/features/feed/actions";
import { BookmarkIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";

export function SaveButton({
  postId,
  initialSaved,
  isAuthenticated,
  iconClassName = "h-5 w-5",
  initialCount,
  className = "",
  countClassName = "text-xs font-medium",
}: {
  postId: string;
  initialSaved: boolean;
  isAuthenticated: boolean;
  iconClassName?: string;
  /** Shows a count below the icon when passed — omit to keep the plain
   * icon-only button used in the feed grid card. */
  initialCount?: number;
  className?: string;
  countClassName?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(initialCount ?? 0);
  const [, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <Link href="/login" className={`text-muted ${className}`}>
        <BookmarkIcon className={iconClassName} />
        {initialCount !== undefined && count > 0 && (
          <span className={countClassName}>{formatCompactNumber(count)}</span>
        )}
      </Link>
    );
  }

  function handleClick() {
    const wasSaved = saved;
    setSaved(!wasSaved);
    setCount((c) => c + (wasSaved ? -1 : 1));

    startTransition(async () => {
      try {
        await toggleSaveAction(postId, wasSaved);
      } catch {
        setSaved(wasSaved);
        setCount((c) => c + (wasSaved ? 1 : -1));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? "Unsave" : "Save"}
      className={`transition-colors ${
        saved ? "text-foreground" : "text-muted hover:text-foreground"
      } ${className}`}
    >
      <BookmarkIcon className={iconClassName} filled={saved} />
      {initialCount !== undefined && count > 0 && (
        <span className={countClassName}>{formatCompactNumber(count)}</span>
      )}
    </button>
  );
}
