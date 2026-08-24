"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleLikeAction } from "@/features/feed/actions";
import { HeartIcon } from "@/components/ui/icons";

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  isAuthenticated,
  iconClassName = "h-5 w-5",
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  isAuthenticated: boolean;
  iconClassName?: string;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 text-sm text-muted"
      >
        <HeartIcon className={iconClassName} />
        {count > 0 && <span>{count}</span>}
      </Link>
    );
  }

  function handleClick() {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((c) => c + (wasLiked ? -1 : 1));

    startTransition(async () => {
      try {
        await toggleLikeAction(postId, wasLiked);
      } catch {
        setLiked(wasLiked);
        setCount((c) => c + (wasLiked ? 1 : -1));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      className={`flex items-center gap-1.5 text-sm transition-colors ${
        liked ? "text-accent" : "text-muted hover:text-foreground"
      }`}
    >
      <HeartIcon className={iconClassName} filled={liked} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
