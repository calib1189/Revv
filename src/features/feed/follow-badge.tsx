"use client";

import { useState, useTransition } from "react";
import { toggleFollowAction } from "@/features/profile/actions";
import { PlusIcon } from "@/components/ui/icons";

/** Small circular "+" overlapping the bottom of an avatar — the compact
 * follow affordance TikTok-style vertical feeds use next to the author's
 * picture, instead of a full "Follow" pill. Disappears once followed,
 * same underlying toggleFollowAction the profile page's full FollowButton
 * uses, just a different shape for a tighter space. */
export function FollowBadge({
  authorId,
  authorUsername,
  initialIsFollowing,
}: {
  authorId: string;
  authorUsername: string;
  initialIsFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialIsFollowing);
  const [, startTransition] = useTransition();

  if (following) return null;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFollowing(true);
    startTransition(async () => {
      try {
        await toggleFollowAction(authorId, authorUsername, false);
      } catch {
        setFollowing(false);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Follow @${authorUsername}`}
      // z-10: RankFrame's ring is drawn via ::before/::after pseudo-elements
      // pinned to z-index 5/6 (globals.css), and .rank-frame never sets its
      // own z-index so it doesn't contain that inside a local stacking
      // context — those values leak out and beat this badge's implicit
      // z-index:auto, painting the ring in front of it. Needs to clear 6.
      className="absolute -bottom-0.5 left-1/2 z-10 flex h-3 w-3 -translate-x-1/2 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_0_0_1px_rgb(0_0_0_/_0.85),0_0_5px_0.5px_rgb(255_68_51_/_0.6)]"
    >
      <PlusIcon className="h-2 w-2" strokeWidth={3} />
    </button>
  );
}
