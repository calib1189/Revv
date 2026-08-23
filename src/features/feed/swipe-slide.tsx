"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LikeButton } from "@/features/feed/like-button";
import { SaveButton } from "@/features/feed/save-button";
import { RankMiniBadge } from "@/features/garage/rank-mini-badge";
import { CaptionText } from "@/features/feed/caption-text";
import { recordViewAction } from "@/features/feed/actions";
import { CommentIcon, EyeIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";
import type { PostCardData } from "@/features/feed/post-card";

function MuteIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      {muted ? (
        <path d="M17 9l4 6M21 9l-4 6" strokeLinecap="round" />
      ) : (
        <path d="M16 8.5a4 4 0 0 1 0 7" strokeLinecap="round" />
      )}
    </svg>
  );
}

function VideoMedia({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = videoRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <video
        ref={videoRef}
        src={url}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onClick={() => setMuted((m) => !m)}
        className="h-full w-full object-contain"
      />
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
      >
        <MuteIcon muted={muted} />
      </button>
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
      className={`relative ${slideHeight} w-full flex-shrink-0 snap-start bg-black`}
    >
      {data.media.length > 0 &&
        (isVideo ? (
          <VideoMedia url={data.media[0].url} />
        ) : (
          <PhotoMedia urls={data.media.map((m) => m.url)} />
        ))}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 pb-6">
        <div className="pointer-events-auto flex items-end justify-between gap-4">
          <div className="min-w-0 flex-1 text-white">
            <Link href={`/u/${data.authorUsername}`} className="text-sm font-semibold hover:underline">
              @{data.authorUsername}
            </Link>
            {data.vehicleTitle && data.post.vehicle_id && (
              <Link
                href={`/garage/${data.post.vehicle_id}`}
                className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white"
              >
                <span>{data.vehicleTitle}</span>
                <RankMiniBadge score={data.vehicleRatingScore} className="h-3.5 w-3.5" />
              </Link>
            )}
            {data.post.caption && (
              <CaptionText
                text={data.post.caption}
                className="mt-1 line-clamp-2 text-sm text-white/90"
              />
            )}
            <p className="mt-1 flex items-center gap-1 text-xs text-white/60">
              <EyeIcon className="h-3.5 w-3.5" />
              {formatCompactNumber(data.viewCount)} view{data.viewCount === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex flex-shrink-0 flex-col items-center gap-4 text-white">
            <LikeButton
              postId={data.post.id}
              initialLiked={data.isLiked}
              initialCount={data.likeCount}
              isAuthenticated={data.isAuthenticated}
            />
            <Link
              href={`/p/${data.post.id}`}
              className="flex flex-col items-center gap-0.5 text-white/90 hover:text-white"
            >
              <CommentIcon className="h-5 w-5" />
              {data.commentCount > 0 && (
                <span className="text-xs">{data.commentCount}</span>
              )}
            </Link>
            <SaveButton
              postId={data.post.id}
              initialSaved={data.isSaved}
              isAuthenticated={data.isAuthenticated}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
