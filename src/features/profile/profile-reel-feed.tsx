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
  // The top bar's real height isn't just its 56px of content — it also
  // has pt-[env(safe-area-inset-top)] for the notch/Dynamic Island
  // (top-tab-bar.tsx), and the bottom nav (fixed, so out of normal
  // document flow entirely) is 64px plus env(safe-area-inset-bottom) for
  // the home-indicator area. The previous fix only added the bottom
  // inset and missed the top one — on any notched iPhone that's another
  // 44-59px this box was too tall by, which is exactly enough to still
  // push the bottom of the video behind the fixed nav. Both insets are
  // zero on a device with no notch and no home-indicator gesture area,
  // so this doesn't change anything there.
  const feedHeight = isAuthenticated
    ? "h-[calc(100dvh-56px-env(safe-area-inset-top)-64px-env(safe-area-inset-bottom))]"
    : "h-[calc(100dvh-56px-env(safe-area-inset-top))]";

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
