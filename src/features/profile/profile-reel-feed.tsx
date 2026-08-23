"use client";

import Link from "next/link";
import { SwipeSlide } from "@/features/feed/swipe-slide";
import { BackIcon } from "@/components/ui/icons";
import type { PostCardData } from "@/features/feed/post-card";

/** Fullscreen swipeable playback for one profile's posts — reuses the same
 * SwipeSlide as the main feed (autoplay-on-visible for video, carousel for
 * photos) scoped to a single author, opened by tapping their profile grid. */
export function ProfileReelFeed({
  posts,
  isAuthenticated,
  backHref,
}: {
  posts: PostCardData[];
  isAuthenticated: boolean;
  backHref: string;
}) {
  const feedHeight = isAuthenticated
    ? "h-[calc(100dvh-56px-64px)]"
    : "h-[calc(100dvh-56px)]";

  return (
    <div className="relative">
      <div className={`no-scrollbar ${feedHeight} snap-y snap-mandatory overflow-y-auto`}>
        {posts.map((post) => (
          <SwipeSlide key={post.post.id} data={post} slideHeight={feedHeight} />
        ))}
      </div>

      <Link
        href={backHref}
        aria-label="Back to profile"
        className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
      >
        <BackIcon className="h-5 w-5" />
      </Link>
    </div>
  );
}
