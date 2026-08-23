"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LikeButton } from "@/features/feed/like-button";
import { SaveButton } from "@/features/feed/save-button";
import { CommentIcon } from "@/components/ui/icons";
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

export function DiscoverSlide({ data }: { data: PostCardData }) {
  const video = data.media[0];
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
    <div
      ref={containerRef}
      className="relative h-[calc(100dvh-56px)] w-full flex-shrink-0 snap-start bg-black"
    >
      {video && (
        <video
          ref={videoRef}
          src={video.url}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          onClick={() => setMuted((m) => !m)}
          className="h-full w-full object-contain"
        />
      )}

      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
      >
        <MuteIcon muted={muted} />
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 pb-6">
        <div className="pointer-events-auto flex items-end justify-between gap-4">
          <div className="min-w-0 flex-1 text-white">
            <Link href={`/u/${data.authorUsername}`} className="text-sm font-semibold hover:underline">
              @{data.authorUsername}
            </Link>
            {data.vehicleTitle && data.post.vehicle_id && (
              <Link
                href={`/garage/${data.post.vehicle_id}`}
                className="block text-xs text-white/70 hover:text-white"
              >
                {data.vehicleTitle}
              </Link>
            )}
            {data.post.caption && (
              <p className="mt-1 line-clamp-2 text-sm text-white/90">
                {data.post.caption}
              </p>
            )}
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
