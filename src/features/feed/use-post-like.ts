"use client";

import { useState, useTransition } from "react";
import { toggleLikeAction } from "@/features/feed/actions";

/** The like-toggle logic LikeButton owns internally, lifted out so
 * SwipeSlide can share one source of truth between the visible like
 * button and double-tap-to-like on the video — both need to drive the
 * same optimistic liked/count state, not two independent copies of it. */
export function usePostLike(postId: string, initialLiked: boolean, initialCount: number) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();

  function toggle() {
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

  /** Double-tap-to-like only ever likes, matching platform convention —
   * tapping a post you've already liked doesn't unlike it. */
  function like() {
    if (!liked) toggle();
  }

  return { liked, count, toggle, like };
}
