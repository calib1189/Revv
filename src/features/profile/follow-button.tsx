"use client";

import { useState, useTransition } from "react";
import { toggleFollowAction } from "@/features/profile/actions";
import { Button } from "@/components/ui/button";

export function FollowButton({
  followeeId,
  followeeUsername,
  initialIsFollowing,
}: {
  followeeId: string;
  followeeUsername: string;
  initialIsFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialIsFollowing);
  const [, startTransition] = useTransition();

  function handleClick() {
    const was = following;
    setFollowing(!was);
    startTransition(async () => {
      try {
        await toggleFollowAction(followeeId, followeeUsername, was);
      } catch {
        setFollowing(was);
      }
    });
  }

  return (
    <Button
      type="button"
      variant={following ? "secondary" : "primary"}
      className="px-4 py-1.5 text-sm"
      onClick={handleClick}
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}
