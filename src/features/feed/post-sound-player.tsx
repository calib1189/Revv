"use client";

import { useEffect, useRef, useState } from "react";
import { VolumeIcon } from "@/components/ui/icons";
import { useSoundSegment } from "@/features/feed/use-sound-segment";

/** A photo post's attached sound, played on the single-post page — the
 * page's only source of audio, since a video's own native track plays
 * unchanged (see swipe-slide.tsx's identical split). Autoplays on
 * mount, since the whole card is already the page's primary content
 * rather than something scrolled into view. Loops just the poster's
 * chosen SOUND_CLIP_MS window starting at `startMs`, not the whole file
 * — see use-sound-segment.ts.
 *
 * Browsers refuse to autoplay *audible* media outside a real user
 * gesture — a plain `.play()` call on mount doesn't count on iOS Safari
 * and, without prior site engagement, most other browsers either. A
 * blocked attempt used to just fail silently; this now falls back to
 * muted playback (always allowed) and shows a persistent tap-to-unmute
 * button, which — because it runs inside a real click handler — browsers
 * do honor. */
export function PostSoundPlayer({ url, startMs }: { url: string; startMs: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useSoundSegment(audioRef, startMs);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().catch(() => {
      setIsMuted(true);
      setAutoplayBlocked(true);
      audio.play().catch(() => {});
    });
    return () => audio.pause();
  }, []);

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    const audio = audioRef.current;
    const next = !isMuted;
    setIsMuted(next);
    setAutoplayBlocked(false);
    if (!audio) return;
    audio.muted = next;
    // Inside a real click handler, so starting audible playback here is
    // allowed even if the automatic attempt above was refused.
    if (!next) audio.play().catch(() => {});
  }

  return (
    <>
      <audio ref={audioRef} src={url} muted={isMuted} />
      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute sound" : "Mute sound"}
        className={`absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white ${
          autoplayBlocked && isMuted ? "animate-pulse" : ""
        }`}
      >
        <VolumeIcon muted={isMuted} className="h-4 w-4" />
      </button>
    </>
  );
}
