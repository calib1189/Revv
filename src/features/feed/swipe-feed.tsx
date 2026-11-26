"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadMoreFeedPostsAction, loadFeedByCategoryAction } from "@/features/feed/actions";
import { SwipeSlide } from "@/features/feed/swipe-slide";
import { SponsoredSlide, type SponsoredSlideData } from "@/features/feed/sponsored-slide";
import { DailyFeedSlide } from "@/features/daily/daily-teaser-card";
import { JustRatedSlide } from "@/features/feed/just-rated-slide";
import { DropSlide } from "@/features/feed/drop-slide";
import type { FeedDrop } from "@/lib/merch/feed-drop";
import type { JustRatedSlideData } from "@/lib/feed/just-rated";
import type { DailyTeaser } from "@/lib/daily/teaser";
import type { BattleView } from "@/lib/battles/load";
import { BattleFeedSlide } from "@/features/battles/battle-feed-slide";
import { BATTLE_SLIDE_ATTR, BattleResultSlide } from "@/features/battles/battle-result-slide";
import { BATTLE_VOTED_EVENT, wasBattleVoted } from "@/lib/battles/seen";
import { CategoryFilterBar } from "@/features/feed/category-filter-bar";
import { StoriesPeek } from "@/features/stories/stories-peek";
import type { TrayPerson } from "@/lib/stories/load";
import { HEADER_HEIGHT } from "@/components/shell/tab-pager-shell";
import { useTabPagerContext } from "@/components/shell/tab-pager-context";
import type { VehicleCategory } from "@/lib/vehicles/category";
import type { PostCardData } from "@/features/feed/post-card";

// Fixed position rather than one per N posts loaded — this app has one
// ad slot's worth of inventory to fill at a time, not a real pacing
// system, so showing it once per session (not re-injected as more
// posts load) is the honest amount of "ad load" to claim credit for.
const AD_INJECTION_INDEX = 3;
// Where the "Just rated" slides sit: one early, then spread out, clear of
// the ad. Placed once, like the ad, not re-injected as more posts load.
const JUST_RATED_INDEXES = [1, 6, 10];
// A limited tee drop sits deep in the feed, clear of all of the above,
// never at the top: it's SORZA selling something, so it waits its turn.
const DROP_INDEX = 8;
// Yesterday's Build Battle winner: early, so being seen is the prize.
const BATTLE_RESULT_INDEX = 2;

export function SwipeFeed({
  initialPosts,
  ad,
  daily = null,
  justRated = [],
  topBuilds = [],
  battle = null,
  battleResult = null,
  battleResultFirst = false,
  viewerUsername = null,
  drop = null,
  isAuthenticated,
  storyTray = [],
}: {
  initialPosts: PostCardData[];
  ad: SponsoredSlideData | null;
  /** Today's Sorza Daily challenge, shown as the first slide. */
  daily?: DailyTeaser | null;
  /** Cars rated in the last few days, slotted between posts. */
  justRated?: JustRatedSlideData[];
  /** The top of the leaderboard, opening the feed for a new viewer. */
  topBuilds?: JustRatedSlideData[];
  /** Today's Build Battle, leading the feed until you've voted. */
  battle?: BattleView | null;
  /** Yesterday's battle, when anyone voted in it: its result reveal. */
  battleResult?: BattleView | null;
  /** The result hasn't been watched on this device yet, so it leads. */
  battleResultFirst?: boolean;
  viewerUsername?: string | null;
  /** A live limited tee drop, as one slide deep in the feed (drop-slide). */
  drop?: FeedDrop | null;
  isAuthenticated: boolean;
  /** Stories from you and people you follow, for the pill at the start
   * of the filter row. */
  storyTray?: TrayPerson[];
}) {
  const [category, setCategory] = useState<VehicleCategory | null>(null);
  const [posts, setPosts] = useState(initialPosts);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length > 0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { registerRefreshHandler } = useTabPagerContext();
  // Bumped whenever the list is replaced (refresh, category change). A
  // response that comes back for an older list is dropped — otherwise a
  // "load more" still in flight when the viewer refreshed would append
  // the old list's next page onto the fresh one.
  const generationRef = useRef(0);

  // Today's battle leads the feed until you've voted. Voting in this open
  // feed (or on the battle page) doesn't rebuild it, so once you have, the
  // card leaves as soon as it's off screen, never while you're looking
  // at it. Owners keep theirs, to share.
  const [battleDone, setBattleDone] = useState(false);
  const scrollFixRef = useRef(0);
  useEffect(() => {
    if (!battle || battle.isOwner || battleDone) return;
    const container = scrollContainerRef.current;
    const slide = container?.querySelector<HTMLElement>(`[${BATTLE_SLIDE_ATTR}]`);
    if (!container || !slide) return;
    let visible = true;
    const retire = () => {
      if (visible || !wasBattleVoted(battle.id)) return;
      // Above where you are: take its height back off the scroll, so the
      // post on screen stays exactly where it is.
      if (slide.getBoundingClientRect().bottom <= container.getBoundingClientRect().top + 1) {
        scrollFixRef.current = slide.offsetHeight;
      }
      setBattleDone(true);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        retire();
      },
      { root: container, threshold: 0 },
    );
    io.observe(slide);
    window.addEventListener(BATTLE_VOTED_EVENT, retire);
    return () => {
      io.disconnect();
      window.removeEventListener(BATTLE_VOTED_EVENT, retire);
    };
  }, [battle, battleDone]);
  useLayoutEffect(() => {
    if (!battleDone || !scrollFixRef.current) return;
    const container = scrollContainerRef.current;
    if (container) container.scrollTop -= scrollFixRef.current;
    scrollFixRef.current = 0;
  }, [battleDone]);

  // Tapping the already-active "For You" tab (top-tab-bar.tsx) is a
  // refresh gesture — back to the unfiltered view, latest posts, top of
  // the list. Registered once: it always resets to the same unfiltered
  // state regardless of whatever category is selected when it fires, so
  // it doesn't need to depend on `category`.
  useEffect(() => {
    registerRefreshHandler("/feed", () => {
      const generation = ++generationRef.current;
      setCategory(null);
      setIsLoading(true);
      loadFeedByCategoryAction(null)
        .then((fresh) => {
          if (generation !== generationRef.current) return;
          setPosts(fresh);
          setHasMore(fresh.length > 0);
          scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        })
        .finally(() => {
          if (generation === generationRef.current) setIsLoading(false);
        });
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
          if (!last?.rankCursor) {
            setIsLoading(false);
            return;
          }
          const generation = generationRef.current;
          loadMoreFeedPostsAction(last.rankCursor, category)
            .then((next) => {
              if (generation !== generationRef.current) return;
              // The ranking can shift between pages, so a post can come
              // back twice; a duplicate would also be a duplicate React key.
              setPosts((prev) => {
                const seen = new Set(prev.map((p) => p.post.id));
                return [...prev, ...next.filter((p) => !seen.has(p.post.id))];
              });
              setHasMore(next.length > 0);
            })
            .finally(() => {
              if (generation === generationRef.current) setIsLoading(false);
            });
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, hasMore, category]);

  function justRatedAt(index: number): JustRatedSlideData | null {
    const k = JUST_RATED_INDEXES.indexOf(index);
    return k >= 0 ? (justRated[k] ?? null) : null;
  }

  // Every post by the blocked author, not just the one the menu was
  // opened on — blocking has to take effect in the feed immediately (App
  // Store guideline 1.2), not on the next fetch.
  function handleBlocked(authorId: string) {
    setPosts((prev) => prev.filter((p) => p.authorId !== authorId));
  }

  function handleCategoryChange(next: VehicleCategory | null) {
    if (next === category) return;
    const generation = ++generationRef.current;
    setCategory(next);
    setIsLoading(true);
    loadFeedByCategoryAction(next)
      .then((fresh) => {
        if (generation !== generationRef.current) return;
        setPosts(fresh);
        setHasMore(fresh.length > 0);
      })
      .finally(() => {
        if (generation === generationRef.current) setIsLoading(false);
      });
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
            leading={storyTray.length > 0 ? <StoriesPeek tray={storyTray} /> : null}
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
          {category === null &&
            topBuilds.map((b) => <JustRatedSlide key={`top-${b.vehicleId}`} data={b} slideHeight={feedHeight} />)}
          {battleResult && battleResultFirst && category === null && (
            <BattleResultSlide view={battleResult} isAuthenticated={isAuthenticated} slideHeight={feedHeight} />
          )}
          {daily && category === null && <DailyFeedSlide teaser={daily} slideHeight={feedHeight} />}
          {battle && !battleDone && category === null && (
            <BattleFeedSlide
              view={battle}
              isAuthenticated={isAuthenticated}
              viewerUsername={viewerUsername}
              slideHeight={feedHeight}
            />
          )}
          {posts.map((post, index) => (
            <div key={post.post.id} className="contents">
              {/* Only on the unfiltered view — the one ad fetched for
                  this session has no relationship to whichever category
                  someone filtered to, so showing it there would just be
                  an irrelevant interruption rather than a placement. */}
              {ad && category === null && index === AD_INJECTION_INDEX && (
                <SponsoredSlide data={ad} slideHeight={feedHeight} />
              )}
              {drop && category === null && index === DROP_INDEX && <DropSlide drop={drop} slideHeight={feedHeight} />}
              {battleResult && !battleResultFirst && category === null && index === BATTLE_RESULT_INDEX && (
                <BattleResultSlide view={battleResult} isAuthenticated={isAuthenticated} slideHeight={feedHeight} />
              )}
              {category === null && justRatedAt(index) && (
                <JustRatedSlide data={justRatedAt(index)!} slideHeight={feedHeight} />
              )}
              <SwipeSlide data={post} slideHeight={feedHeight} onBlocked={handleBlocked} />
            </div>
          ))}
          {/* A short feed that's run out still shows the rest at the end,
              rather than never reaching their spot. */}
          {category === null &&
            !hasMore &&
            justRated
              .filter((_, k) => (JUST_RATED_INDEXES[k] ?? Infinity) >= posts.length)
              .map((data) => <JustRatedSlide key={data.vehicleId} data={data} slideHeight={feedHeight} />)}
          {battleResult && !battleResultFirst && category === null && !hasMore && posts.length <= BATTLE_RESULT_INDEX && (
            <BattleResultSlide view={battleResult} isAuthenticated={isAuthenticated} slideHeight={feedHeight} />
          )}
          {hasMore && <div ref={sentinelRef} className="h-1" />}
        </div>
      )}
    </div>
  );
}
