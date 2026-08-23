"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadMoreFeedPostsAction } from "@/features/feed/actions";
import { SwipeSlide } from "@/features/feed/swipe-slide";
import type { PostCardData } from "@/features/feed/post-card";

export function SwipeFeed({
  initialPosts,
  isAuthenticated,
}: {
  initialPosts: PostCardData[];
  isAuthenticated: boolean;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length > 0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading) {
          setIsLoading(true);
          const last = posts[posts.length - 1];
          if (!last) {
            setIsLoading(false);
            return;
          }
          loadMoreFeedPostsAction(last.post.created_at)
            .then((next) => {
              setPosts((prev) => [...prev, ...next]);
              setHasMore(next.length > 0);
            })
            .finally(() => setIsLoading(false));
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, hasMore]);

  const feedHeight = isAuthenticated
    ? "h-[calc(100dvh-56px-64px)]"
    : "h-[calc(100dvh-56px)]";

  if (posts.length === 0) {
    return (
      <div className={`flex ${feedHeight} flex-col items-center justify-center gap-4 text-center`}>
        <p className="text-lg font-medium">No posts yet</p>
        <p className="max-w-xs text-sm text-muted">
          {isAuthenticated
            ? "Share something from your garage to get the feed started."
            : "Log in to be the first to post."}
        </p>
        <Link
          href={isAuthenticated ? "/feed/new" : "/login"}
          className="rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground"
        >
          {isAuthenticated ? "Create a post" : "Log in"}
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={`no-scrollbar ${feedHeight} snap-y snap-mandatory overflow-y-auto`}>
        {posts.map((post) => (
          <SwipeSlide key={post.post.id} data={post} slideHeight={feedHeight} />
        ))}
        {hasMore && <div ref={sentinelRef} className="h-1" />}
      </div>
    </div>
  );
}
