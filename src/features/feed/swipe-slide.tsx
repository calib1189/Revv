"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SaveButton } from "@/features/feed/save-button";
import { PostOptionsSheet } from "@/features/feed/post-options-sheet";
import { FollowBadge } from "@/features/feed/follow-badge";
import { CommentSheet } from "@/features/feed/comment-sheet";
import { Avatar } from "@/features/feed/avatar";
import { RankFrame } from "@/features/garage/rank-frame";
import { CaptionText } from "@/features/feed/caption-text";
import { recordViewAction, recordViewCompletionAction, recordShareAction } from "@/features/feed/actions";
import { usePostLike } from "@/features/feed/use-post-like";
import { useDoubleTap } from "@/features/feed/use-double-tap";
import { CommentIcon, EyeIcon, HeartIcon, PlayIcon, ShareIcon, VerifiedBadgeIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";
import { SITE_URL } from "@/lib/site-url";
import { HEADER_HEIGHT } from "@/components/shell/tab-pager-shell";
import type { PostCardData } from "@/features/feed/post-card";

function ShareButton({ postId }: { postId: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleShare() {
    const url = `${SITE_URL}/p/${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
        // Only a completed share (not a dismissed sheet) counts as a
        // real signal for the feed ranking algorithm — navigator.share
        // resolving means the OS share sheet's own action actually went
        // through, not just that it was opened.
        recordShareAction(postId);
      } catch {
        // User dismissed the native share sheet — not an error, and not
        // a share that should count toward this post's engagement.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      recordShareAction(postId);
    } catch {
      // Clipboard access can be denied (browser settings, an insecure
      // context) even when navigator.clipboard exists — silently doing
      // nothing here would leave someone tapping Share with zero
      // feedback and no way to know it didn't work.
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex flex-col items-center gap-1 text-white/90 hover:text-white"
    >
      <ShareIcon className="h-8 w-8" />
      {status === "copied" && <span className="text-xs font-medium">Copied</span>}
      {status === "failed" && <span className="text-xs font-medium text-danger">Couldn&apos;t copy</span>}
    </button>
  );
}

// A looping video (see the `loop` attribute below) never fires `ended`
// — it seeks back to 0 instead — so "watched all the way through" has
// to be detected via how far into the clip playback has gotten, not
// waiting for a completion event that will never come. 0.9 rather than
// 1.0 tolerates a video whose last handful of frames never quite get a
// `timeupdate` tick before looping.
const COMPLETION_THRESHOLD = 0.9;

function VideoMedia({
  url,
  shouldLoad,
  postId,
  trackCompletion,
  onDoubleTapLike,
}: {
  url: string;
  /** False until this slide has scrolled near the viewport — until then
   * `src` isn't set at all, so no request goes out. Every slide loaded
   * into the feed (initial batch plus every infinite-scroll page) used
   * to mount a real <video src> immediately regardless of whether it was
   * ever actually scrolled to, which is exactly what blew up Supabase
   * Storage egress: every post ever fetched issued a real network
   * request the moment it was fetched, not when it was watched. */
  shouldLoad: boolean;
  postId: string;
  /** Skips wiring up completion tracking at all for a logged-out viewer
   * — recordViewCompletionAction would just no-op anyway, but there's
   * no reason to attach the listener or make the call in the first
   * place for someone with no engagement history to feed. */
  trackCompletion: boolean;
  onDoubleTapLike: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [heartPop, setHeartPop] = useState(0);
  const hasRecordedCompletion = useRef(false);

  useEffect(() => {
    const el = videoRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          el.play().catch(() => {});
          setIsPaused(false);
        } else {
          el.pause();
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!trackCompletion) return;
    const el = videoRef.current;
    if (!el) return;

    function onTimeUpdate() {
      if (hasRecordedCompletion.current) return;
      if (!el!.duration || !Number.isFinite(el!.duration)) return;
      if (el!.currentTime / el!.duration >= COMPLETION_THRESHOLD) {
        hasRecordedCompletion.current = true;
        recordViewCompletionAction(postId);
      }
    }
    el.addEventListener("timeupdate", onTimeUpdate);
    return () => el.removeEventListener("timeupdate", onTimeUpdate);
  }, [postId, trackCompletion]);

  function togglePlayPause() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setIsPaused(false);
    } else {
      el.pause();
      setIsPaused(true);
    }
  }

  const handleTap = useDoubleTap(togglePlayPause, () => {
    setHeartPop((n) => n + 1);
    onDoubleTapLike();
  });

  return (
    <div ref={containerRef} className="absolute inset-0" onClick={handleTap}>
      <video
        ref={videoRef}
        src={shouldLoad ? url : undefined}
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
      {isPaused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <PlayIcon className="h-16 w-16 text-white/85 drop-shadow-[0_2px_10px_rgb(0_0_0_/_0.6)]" />
        </div>
      )}
      {heartPop > 0 && (
        <div key={heartPop} className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <HeartIcon
            filled
            className="h-28 w-28 animate-heart-pop text-white drop-shadow-[0_2px_14px_rgb(0_0_0_/_0.6)]"
          />
        </div>
      )}
    </div>
  );
}

function PhotoMedia({ urls, shouldLoad }: { urls: string[]; shouldLoad: boolean }) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = containerRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto"
      >
        {urls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- full-bleed slide, next/image fill needs a sized ancestor we don't have here
          <img
            key={i}
            src={shouldLoad ? url : undefined}
            alt=""
            loading="lazy"
            className="h-full w-full flex-shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      {urls.length > 1 && (
        <div className="pointer-events-none absolute right-4 top-4 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
          {index + 1}/{urls.length}
        </div>
      )}
    </div>
  );
}

export function SwipeSlide({
  data,
  slideHeight = "h-[calc(100dvh-56px-64px)]",
  extraTopInset = "0px",
}: {
  data: PostCardData;
  slideHeight?: string;
  /** Extra space to clear below the real header before the "..." menu
   * starts — the main FYP passes its category-filter-bar's height here
   * (swipe-feed.tsx) since that floats in the same top strip; the
   * profile reel view (no filter bar) just uses the default. */
  extraTopInset?: string;
}) {
  const isVideo = data.media[0]?.kind === "video";
  const containerRef = useRef<HTMLDivElement>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shouldLoadMedia, setShouldLoadMedia] = useState(false);
  // Local override so an edited caption shows immediately — `data` is a
  // snapshot from whichever server fetch produced this slide, and
  // there's no cheap way to force that all the way back in sync after
  // a caption edit without a full page reload.
  const [captionOverride, setCaptionOverride] = useState<string | null | undefined>(undefined);
  const displayedCaption = captionOverride === undefined ? data.post.caption : captionOverride;
  const { liked, count: likeCount, toggle: toggleLike, like } = usePostLike(
    data.post.id,
    data.isLiked,
    data.likeCount,
  );

  useEffect(() => {
    // Every post the feed has fetched (initial batch, every infinite-
    // scroll page, every category switch) used to mount a real <video>/
    // <img src> the instant it rendered, regardless of whether it was
    // ever scrolled to — this is what actually drove Supabase Storage
    // egress into the 300%+ range with only a handful of real users.
    // A generous rootMargin starts the request a bit before the slide is
    // actually on screen (so scrolling still feels instant) without
    // loading every post in the whole list up front. Once true it stays
    // true — the point is "don't fetch until needed," not "unload it
    // again the moment it scrolls away," which would just force a
    // re-fetch on scrolling back.
    if (shouldLoadMedia) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShouldLoadMedia(true);
      },
      { rootMargin: "150% 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoadMedia]);

  useEffect(() => {
    if (!data.isAuthenticated) return;
    const el = containerRef.current;
    if (!el) return;

    // Fires once per crossing into >60% visible — not continuously while
    // it stays visible — so scrolling away and back (or a post the user
    // returns to later) attempts a new view each time. The cooldown that
    // actually prevents over-counting lives server-side now
    // (recordPostView, lib/db/post-views.ts), since every rewatch is
    // meant to count, just not unboundedly.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          recordViewAction(data.post.id);
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [data.isAuthenticated, data.post.id]);

  return (
    <div
      ref={containerRef}
      className={`relative ${slideHeight} w-full flex-shrink-0 snap-start overflow-hidden bg-black`}
    >
      {data.media.length > 0 &&
        (isVideo ? (
          <VideoMedia
            url={data.media[0].url}
            shouldLoad={shouldLoadMedia}
            postId={data.post.id}
            trackCompletion={data.isAuthenticated}
            onDoubleTapLike={like}
          />
        ) : (
          <PhotoMedia urls={data.media.map((m) => m.url)} shouldLoad={shouldLoadMedia} />
        ))}

      {data.isOwnPost && (
        <div
          className="pointer-events-auto absolute right-3 z-10"
          style={{ top: `calc(${HEADER_HEIGHT} + ${extraTopInset} + 0.5rem)` }}
        >
          <PostOptionsSheet
            postId={data.post.id}
            caption={displayedCaption}
            onCaptionUpdated={setCaptionOverride}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 pb-6">
        <div className="pointer-events-auto min-w-0 max-w-[calc(100%-4.5rem)] text-white">
          <Link
            href={`/u/${data.authorUsername}?from=${data.post.id}`}
            className="flex items-center gap-1.5 text-base font-bold hover:underline"
          >
            @{data.authorUsername}
            {data.authorIsVerified && (
              <VerifiedBadgeIcon className="h-4.5 w-4.5 flex-shrink-0 text-accent" />
            )}
          </Link>
          {data.vehicleTitle && data.post.vehicle_id && (
            <Link
              href={`/garage/${data.post.vehicle_id}?from=${data.post.id}`}
              className="block text-xs text-white/70 hover:text-white"
            >
              • {data.vehicleTitle}
            </Link>
          )}
          {displayedCaption && (
            <CaptionText
              text={displayedCaption}
              className="mt-1.5 line-clamp-2 text-sm text-white/90"
            />
          )}
          <p className="mt-1.5 flex items-center gap-1 text-xs text-white/60">
            <EyeIcon className="h-3.5 w-3.5" />
            {formatCompactNumber(data.viewCount)} view{data.viewCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-6 right-3 flex flex-col items-center gap-6 text-white [&_svg]:drop-shadow-[0_1px_5px_rgb(0_0_0_/_0.7)]">
        <div className="relative">
          <Link href={`/u/${data.authorUsername}?from=${data.post.id}`}>
            <RankFrame
              score={data.authorBestRatingScore}
              compact
              hideBadge
              className="rounded-full shadow-[0_0_0_2px_rgb(255_68_51_/_0.35),0_0_16px_2px_rgb(255_68_51_/_0.35)]"
            >
              <Avatar
                username={data.authorUsername}
                avatarUrl={data.authorAvatarUrl}
                className="h-14 w-14 border-2 border-white text-base"
              />
            </RankFrame>
          </Link>
          {data.isAuthenticated && !data.isOwnPost && data.isFollowingAuthor === false && (
            <FollowBadge
              authorId={data.authorId}
              authorUsername={data.authorUsername}
              initialIsFollowing={false}
            />
          )}
        </div>

        {data.isAuthenticated ? (
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={liked}
            aria-label={liked ? "Unlike" : "Like"}
            className={`flex flex-col items-center gap-1.5 transition-colors ${
              liked ? "text-accent" : "text-white hover:text-white/80"
            }`}
          >
            <HeartIcon className="h-9 w-9" filled={liked} />
            {likeCount > 0 && (
              <span className="text-sm font-semibold">{formatCompactNumber(likeCount)}</span>
            )}
          </button>
        ) : (
          <Link href="/login" className="flex flex-col items-center gap-1.5 text-white">
            <HeartIcon className="h-9 w-9" />
            {likeCount > 0 && (
              <span className="text-sm font-semibold">{formatCompactNumber(likeCount)}</span>
            )}
          </Link>
        )}

        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          className="flex flex-col items-center gap-1.5 text-white/90 hover:text-white"
        >
          <CommentIcon className="h-9 w-9" />
          {data.commentCount > 0 && (
            <span className="text-sm font-semibold">{formatCompactNumber(data.commentCount)}</span>
          )}
        </button>

        <SaveButton
          postId={data.post.id}
          initialSaved={data.isSaved}
          initialCount={data.saveCount}
          isAuthenticated={data.isAuthenticated}
          iconClassName="h-9 w-9"
          className="flex flex-col items-center gap-1.5"
          countClassName="text-sm font-semibold"
        />

        <ShareButton postId={data.post.id} />
      </div>

      <CommentSheet
        postId={data.post.id}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        isAuthenticated={data.isAuthenticated}
        initialCount={data.commentCount}
      />
    </div>
  );
}
