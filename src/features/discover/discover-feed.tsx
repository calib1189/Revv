"use client";

import { useEffect, useRef, useState } from "react";
import { loadMoreDiscoverPostsAction } from "@/features/discover/actions";
import { DiscoverSlide } from "@/features/discover/discover-slide";
import type { PostCardData } from "@/features/feed/post-card";

export function DiscoverFeed({ initialPosts }: { initialPosts: PostCardData[] }) {
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
          loadMoreDiscoverPostsAction(last.post.created_at)
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

  if (posts.length === 0) {
    return (
      <div className="flex h-[calc(100dvh-56px)] flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-medium">No videos yet</p>
        <p className="max-w-xs text-sm text-muted">
          Video posts will show up here as people share them.
        </p>
      </div>
    );
  }

  return (
    <div className="no-scrollbar h-[calc(100dvh-56px)] snap-y snap-mandatory overflow-y-auto">
      {posts.map((post) => (
        <DiscoverSlide key={post.post.id} data={post} />
      ))}
      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </div>
  );
}
