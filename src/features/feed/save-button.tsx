"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleSaveAction } from "@/features/feed/actions";
import { BookmarkIcon } from "@/components/ui/icons";

export function SaveButton({
  postId,
  initialSaved,
  isAuthenticated,
  iconClassName = "h-5 w-5",
}: {
  postId: string;
  initialSaved: boolean;
  isAuthenticated: boolean;
  iconClassName?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <Link href="/login" className="text-muted">
        <BookmarkIcon className={iconClassName} />
      </Link>
    );
  }

  function handleClick() {
    const wasSaved = saved;
    setSaved(!wasSaved);

    startTransition(async () => {
      try {
        await toggleSaveAction(postId, wasSaved);
      } catch {
        setSaved(wasSaved);
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
      }`}
    >
      <BookmarkIcon className={iconClassName} filled={saved} />
    </button>
  );
}
