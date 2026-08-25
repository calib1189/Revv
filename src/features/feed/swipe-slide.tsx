"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SaveButton } from "@/features/feed/save-button";
import { VideoOptionsMenu } from "@/features/feed/video-options-menu";
import { FollowBadge } from "@/features/feed/follow-badge";
import { CommentSheet } from "@/features/feed/comment-sheet";
import { Avatar } from "@/features/feed/avatar";
import { RankFrame } from "@/features/garage/rank-frame";
import { CaptionText } from "@/features/feed/caption-text";
import { recordViewAction } from "@/features/feed/actions";
import { usePostLike } from "@/features/feed/use-post-like";
import { useDoubleTap } from "@/features/feed/use-double-tap";
import { CommentIcon, EyeIcon, HeartIcon, PlayIcon, ShareIcon, VerifiedBadgeIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";
import { SITE_URL } from "@/lib/site-url";
import type { PostCardData } from "@/features/feed/post-card";

function ShareButton({ postId }: { postId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${SITE_URL}/p/${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // User dismissed the native share sheet — not an error.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex flex-col items-center gap-1 text-white/90 hover:text-white"
    >
      <ShareIcon className="h-8 w-8" />
      {copied && <span className="text-xs font-medium">Copied</span>}
    </button>
  );
}

function VideoMedia({ url, onDoubleTapLike }: { url: string; onDoubleTapLike: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [heartPop, setHeartPop] = useState(0);

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
        src={url}
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-contain"
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

function PhotoMedia({ urls }: { urls: string[] }) {
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
            src={url}
            alt=""
            className="h-full w-full flex-shrink-0 snap-center object-contain"
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
}: {
  data: PostCardData;
  slideHeight?: string;
}) {
  const isVideo = data.media[0]?.kind === "video";
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRecordedView = useRef(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const { liked, count: likeCount, toggle: toggleLike, like } = usePostLike(
    data.post.id,
    data.isLiked,
    data.likeCount,
  );

  useEffect(() => {
    if (!data.isAuthenticated) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          entry.intersectionRatio > 0.6 &&
          !hasRecordedView.current
        ) {
          hasRecordedView.current = true;
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
          <VideoMedia url={data.media[0].url} onDoubleTapLike={like} />
        ) : (
          <PhotoMedia urls={data.media.map((m) => m.url)} />
        ))}

      {data.isOwnPost && (
        <div className="pointer-events-auto absolute right-3 top-4 z-10">
          <VideoOptionsMenu postId={data.post.id} />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 pb-6">
        <div className="pointer-events-auto min-w-0 max-w-[calc(100%-4.5rem)] text-white">
          <Link
            href={`/u/${data.authorUsername}`}
            className="flex items-center gap-1.5 text-base font-bold hover:underline"
          >
            @{data.authorUsername}
            {data.authorIsVerified && (
              <VerifiedBadgeIcon className="h-4.5 w-4.5 flex-shrink-0 text-accent" />
            )}
          </Link>
          {data.vehicleTitle && data.post.vehicle_id && (
            <Link
              href={`/garage/${data.post.vehicle_id}`}
              className="block text-xs text-white/70 hover:text-white"
            >
              • {data.vehicleTitle}
            </Link>
          )}
          {data.post.caption && (
            <CaptionText
              text={data.post.caption}
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
          <Link href={`/u/${data.authorUsername}`}>
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
