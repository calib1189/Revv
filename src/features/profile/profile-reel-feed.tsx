"use client";

import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { SwipeSlide } from "@/features/feed/swipe-slide";
import { BackIcon } from "@/components/ui/icons";
import type { PostCardData } from "@/features/feed/post-card";

/** Fullscreen swipeable playback for one profile's posts — reuses the same
 * SwipeSlide as the main feed (autoplay-on-visible for video, carousel for
 * photos) scoped to a single author, opened by tapping their profile grid.
 * Also reused as-is for a sound's own reel page (every post that used it),
 * via the optional headerContent slot next to the back button — the sound
 * page's title/artist/"Use this sound" bar, with nothing rendered here by
 * default so the plain profile-reel caller is unchanged. */
export function ProfileReelFeed({
  posts: initialPosts,
  isAuthenticated,
  backHref,
  headerContent,
}: {
  posts: PostCardData[];
  isAuthenticated: boolean;
  backHref: string;
  headerContent?: ReactNode;
}) {
  const [posts, setPosts] = useState(initialPosts);

  // A fixed layer that sits over the site's top tab bar and footer, so the
  // video runs from the very top of the screen (under the status bar) down
  // to the bottom nav instead of being boxed in by chrome that has nothing
  // to do with watching a post. The bottom nav is deliberately left
  // showing for a signed-in viewer — the layer just stops above it — so
  // the way back to the main tabs is never taken away. --slide-top-inset
  // pushes the in-slide controls (photo counter, sound mute) clear of the
  // notch; it's unset everywhere else, where the slide already starts
  // below the top bar.
  const bottomOffset = isAuthenticated
    ? "bottom-[calc(4rem+env(safe-area-inset-bottom))]"
    : "bottom-0";

  return (
    <div
      className={`fixed inset-x-0 top-0 z-20 bg-black ${bottomOffset}`}
      style={{ "--slide-top-inset": "env(safe-area-inset-top)" } as CSSProperties}
    >
      <div className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto">
        {posts.map((post) => (
          <SwipeSlide
            key={post.post.id}
            data={post}
            slideHeight="h-full"
            onBlocked={(authorId) => setPosts((prev) => prev.filter((p) => p.authorId !== authorId))}
          />
        ))}
      </div>

      <Link
        href={backHref}
        aria-label="Back"
        className="pressable absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
      >
        <BackIcon className="h-5 w-5" />
      </Link>

      {headerContent && (
        <div className="absolute inset-x-16 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10">
          {headerContent}
        </div>
      )}
    </div>
  );
}
