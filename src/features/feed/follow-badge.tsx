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
      className="absolute -bottom-1.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_0_0_2px_rgb(0_0_0_/_0.85)]"
    >
      <PlusIcon className="h-3 w-3" strokeWidth={3} />
    </button>
  );
}
