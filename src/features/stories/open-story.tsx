"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStories } from "@/features/stories/story-viewer-provider";

/** Opens one story over the poster's profile (see /stories/[storyId]). */
export function OpenStory({ authorId, username, storyId }: { authorId: string; username: string; storyId: string }) {
  const { openStories } = useStories();
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    openStories([authorId], authorId, storyId);
    router.replace(`/u/${username}`);
  }, [authorId, username, storyId, openStories, router]);
  return <div className="flex-1" />;
}
