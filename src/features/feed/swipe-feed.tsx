"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadMoreFeedPostsAction, loadFeedByCategoryAction } from "@/features/feed/actions";
import { SwipeSlide } from "@/features/feed/swipe-slide";
import { SponsoredSlide, type SponsoredSlideData } from "@/features/feed/sponsored-slide";
import { CategoryFilterBar } from "@/features/feed/category-filter-bar";
import { HEADER_HEIGHT } from "@/components/shell/tab-pager-shell";
import { useTabPagerContext } from "@/components/shell/tab-pager-context";
import type { VehicleCategory } from "@/lib/vehicles/category";
import type { PostCardData } from "@/features/feed/post-card";

// Fixed position rather than one per N posts loaded — this app has one
// ad slot's worth of inventory to fill at a time, not a real pacing
// system, so showing it once per session (not re-injected as more
// posts load) is the honest amount of "ad load" to claim credit for.
const AD_INJECTION_INDEX = 3;

export function SwipeFeed({
  initialPosts,
  ad,
  isAuthenticated,
}: {
  initialPosts: PostCardData[];
  ad: SponsoredSlideData | null;
  isAuthenticated: boolean;
}) {
  const [category, setCategory] = useState<VehicleCategory | null>(null);
  const [posts, setPosts] = useState(initialPosts);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length > 0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { registerRefreshHandler } = useTabPagerContext();

  // Tapping the already-active "For You" tab (top-tab-bar.tsx) is a
  // refresh gesture — back to the unfiltered view, latest posts, top of
  // the list. Registered once: it always resets to the same unfiltered
  // state regardless of whatever category is selected when it fires, so
  // it doesn't need to depend on `category`.
  useEffect(() => {
    registerRefreshHandler("/feed", () => {
      setCategory(null);
      setIsLoading(true);
      loadFeedByCategoryAction(null)
        .then((fresh) => {
          setPosts(fresh);
          setHasMore(fresh.length > 0);
          scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        })
        .finally(() => setIsLoading(false));
    });
    return () => registerRefreshHandler("/feed", null);
  }, [registerRefreshHandler]);

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
          loadMoreFeedPostsAction(last.post.created_at, category)
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
  }, [posts, hasMore, category]);

  function handleCategoryChange(next: VehicleCategory | null) {
    if (next === category) return;
    setCategory(next);
    setIsLoading(true);
    loadFeedByCategoryAction(next)
      .then((fresh) => {
        setPosts(fresh);
        setHasMore(fresh.length > 0);
      })
      .finally(() => setIsLoading(false));
  }

  // Full-bleed: the video fills whatever box the tab pager slot gives
  // this panel (tab-pager-shell.tsx pulls the whole pager up behind the
  // transparent top nav and sizes every slot to the same
  // bottom-nav-aware height) — this component no longer computes that
  // itself, it just fills its slot.
  const feedHeight = "h-full";

  return (
    <div className="relative h-full">
      {/* Floats over the video (sibling of the scroll container below,
          not inside it) so it stays put while swiping between videos —
          same reason the top tab bar isn't part of the scrolling page. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10" style={{ paddingTop: HEADER_HEIGHT }}>
        <div className="pointer-events-auto">
          <CategoryFilterBar
            selected={category}
            onSelect={handleCategoryChange}
            disabled={isLoading}
          />
        </div>
      </div>

      {posts.length === 0 ? (
        <div
          className={`flex ${feedHeight} flex-col items-center justify-center gap-4 text-center`}
        >
          <p className="text-lg font-medium">
            {category ? "No posts in this category yet" : "No posts yet"}
          </p>
          <p className="max-w-xs text-sm text-muted">
            {category
              ? "Try a different category, or check back later."
              : isAuthenticated
                ? "Share something from your garage to get the feed started."
                : "Log in to be the first to post."}
          </p>
          {!category && (
            <Link
              href={isAuthenticated ? "/feed/new" : "/login"}
              className="rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground"
            >
              {isAuthenticated ? "Create a post" : "Log in"}
            </Link>
          )}
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className={`no-scrollbar ${feedHeight} snap-y snap-mandatory overflow-y-auto`}
        >
          {posts.map((post, index) => (
            <div key={post.post.id} className="contents">
              {/* Only on the unfiltered view — the one ad fetched for
                  this session has no relationship to whichever category
                  someone filtered to, so showing it there would just be
                  an irrelevant interruption rather than a placement. */}
              {ad && category === null && index === AD_INJECTION_INDEX && (
                <SponsoredSlide data={ad} slideHeight={feedHeight} />
              )}
              <SwipeSlide data={post} slideHeight={feedHeight} extraTopInset="3rem" />
            </div>
          ))}
          {hasMore && <div ref={sentinelRef} className="h-1" />}
        </div>
      )}
    </div>
  );
}
