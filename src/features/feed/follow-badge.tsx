"use client";

import { useState, useTransition } from "react";
import { toggleFollowAction } from "@/features/profile/actions";
import { CheckIcon, PlusIcon } from "@/components/ui/icons";

/** The round "+" overlapping the bottom of the author's avatar in the
 * feed — TikTok's follow affordance. On tap it turns into a check, holds
 * a beat so the follow visibly registered, then folds away. Same
 * toggleFollowAction the profile page's full FollowButton uses. */
export function FollowBadge({
  authorId,
  authorUsername,
  initialIsFollowing,
}: {
  authorId: string;
  authorUsername: string;
  initialIsFollowing: boolean;
}) {
  const [state, setState] = useState<"idle" | "confirming" | "gone">(
    initialIsFollowing ? "gone" : "idle",
  );
  const [, startTransition] = useTransition();

  if (state === "gone") return null;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (state !== "idle") return;
    setState("confirming");
    setTimeout(() => setState((s) => (s === "confirming" ? "gone" : s)), 900);
    startTransition(async () => {
      try {
        await toggleFollowAction(authorId, authorUsername, false);
      } catch {
        setState("idle");
      }
    });
  }

  const confirming = state === "confirming";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={confirming ? `Following @${authorUsername}` : `Follow @${authorUsername}`}
      // z-10: RankFrame's ring is drawn via pseudo-elements pinned to
      // z-index 5/6 that leak out of it (it sets no z-index of its own),
      // and would otherwise paint over this badge.
      className={`absolute -bottom-2.5 left-1/2 z-10 flex h-[22px] w-[22px] -translate-x-1/2 items-center justify-center rounded-full shadow-[0_2px_6px_rgb(0_0_0/0.45)] transition-[background-color,color,transform] duration-300 ease-[var(--ease-ios)] ${
        confirming ? "scale-110 bg-white text-accent" : "bg-accent text-white active:scale-90"
      }`}
    >
      {confirming ? (
        <CheckIcon className="h-3 w-3" strokeWidth={3.5} />
      ) : (
        <PlusIcon className="h-3 w-3" strokeWidth={3.5} />
      )}
    </button>
  );
}
