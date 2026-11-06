"use client";

import { useEffect, useRef, useState } from "react";

/** A bare <video preload="metadata"> reliably loads duration/dimensions,
 * but several browsers (mobile Safari especially) never actually decode
 * and paint a visible frame until playback starts — which is exactly why
 * "no thumbnails for any of the videos" showed up as a blank/black box
 * instead of a frame from the clip. Seeking to a tiny offset once
 * metadata is ready forces the browser to decode and paint that frame,
 * which then just sits there as a real poster image — without
 * downloading the whole file the way preload="auto" would for every
 * video in a grid.
 *
 * Painting that frame still pulls a few MB per clip from Supabase
 * Storage, so the src is only attached once the tile gets near the
 * screen. A profile with forty videos no longer fetches all forty the
 * moment it opens. */
export function VideoThumbnail({ url, className }: { url: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [nearView, setNearView] = useState(false);

  useEffect(() => {
    if (nearView) return;
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNearView(true);
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nearView]);

  return (
    <video
      ref={videoRef}
      src={nearView ? url : undefined}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => {
        const video = e.currentTarget;
        video.currentTime = Math.min(0.1, video.duration / 2 || 0.1);
      }}
      className={className}
    />
  );
}
