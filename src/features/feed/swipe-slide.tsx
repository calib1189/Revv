"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Link from "next/link";
import { SaveButton } from "@/features/feed/save-button";
import { PostContextMenu } from "@/features/feed/post-context-menu";
import { FollowBadge } from "@/features/feed/follow-badge";
import { CommentSheet } from "@/features/feed/comment-sheet";
import { Avatar } from "@/features/feed/avatar";
import { RankFrame } from "@/features/garage/rank-frame";
import { CaptionText } from "@/features/feed/caption-text";
import { recordViewAction, recordViewCompletionAction, recordShareAction } from "@/features/feed/actions";
import { usePostLike } from "@/features/feed/use-post-like";
import { useDoubleTap } from "@/features/feed/use-double-tap";
import { useLongPress } from "@/features/feed/use-long-press";
import { useSoundSegment } from "@/features/feed/use-sound-segment";
import {
  CommentIcon,
  EyeIcon,
  HeartIcon,
  MusicIcon,
  PlayIcon,
  ShareIcon,
  VolumeIcon,
  WheelIcon,
} from "@/components/ui/icons";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { formatCompactNumber } from "@/lib/format/compact-number";
import { relativeTime } from "@/lib/format/relative-time";
import { SITE_URL } from "@/lib/site-url";
import type { PostCardData } from "@/features/feed/post-card";

/** The shadow every white control on the video carries, so it stays
 * legible over a bright frame without a box behind it. */
const ON_VIDEO_SHADOW = "[filter:drop-shadow(0_1px_4px_rgb(0_0_0/0.55))]";

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

function ShareAction({ postId }: { postId: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleShare() {
    const url = `${SITE_URL}/p/${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
        // Only a completed share (not a dismissed sheet) counts as a real
        // signal for the feed ranking algorithm.
        recordShareAction(postId);
      } catch {
        // Dismissed — not an error, and not a share.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      recordShareAction(postId);
    } catch {
      // Clipboard access can be denied even when navigator.clipboard
      // exists — silently doing nothing would leave someone tapping Share
      // with no way to know it didn't work.
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 1600);
  }

  return (
    <RailAction
      onClick={handleShare}
      label="Share"
      caption={status === "copied" ? "Copied" : status === "failed" ? "Failed" : "Share"}
    >
      <ShareIcon className="h-[30px] w-[30px]" strokeWidth={1.9} />
    </RailAction>
  );
}

/** One control in the action rail: the icon, and its count (or name)
 * underneath — the column every short-video app has taught people to
 * read. */
function RailAction({
  onClick,
  href,
  label,
  caption,
  pressed,
  children,
}: {
  onClick?: () => void;
  href?: string;
  label: string;
  caption?: string | null;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  const inner = (
    <>
      <span className="flex h-11 w-11 items-center justify-center">{children}</span>
      {caption && <span className="numeral text-[0.75rem] leading-none">{caption}</span>}
    </>
  );
  const className = `pressable flex flex-col items-center gap-1 text-white ${ON_VIDEO_SHADOW}`;
  if (href) {
    return (
      <Link href={href} aria-label={label} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={pressed} className={className}>
      {inner}
    </button>
  );
}

/** The like button's own moment: the heart fills red with a quick beat
 * and a ring that bursts out from it. Keyed so every new like replays it;
 * un-liking just empties the heart without fanfare. */
function LikeAction({
  liked,
  count,
  onToggle,
  isAuthenticated,
  burstKey,
}: {
  liked: boolean;
  count: number;
  onToggle: () => void;
  isAuthenticated: boolean;
  burstKey: number;
}) {
  const heart = (
    <span className="relative flex h-11 w-11 items-center justify-center">
      {liked && burstKey > 0 && (
        <span
          key={`ring-${burstKey}`}
          aria-hidden
          className="animate-like-ring absolute inset-0 rounded-full border-2 border-accent"
        />
      )}
      <HeartIcon
        key={`heart-${burstKey}`}
        filled={liked}
        className={`h-[34px] w-[34px] transition-colors duration-150 ${liked ? "animate-like-beat text-accent" : "text-white"}`}
      />
    </span>
  );
  const caption = count > 0 ? formatCompactNumber(count) : null;
  const className = `pressable flex flex-col items-center gap-1 text-white ${ON_VIDEO_SHADOW}`;

  if (!isAuthenticated) {
    return (
      <Link href="/login" aria-label="Log in to like" className={className}>
        {heart}
        {caption && <span className="numeral text-[0.75rem] leading-none">{caption}</span>}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      className={className}
    >
      {heart}
      {caption && <span className="numeral text-[0.75rem] leading-none">{caption}</span>}
    </button>
  );
}

/** The record that turns at the bottom of the rail while a post with a
 * sound plays — tap it to open that sound. Only ever shown for a post that
 * really has one. */
function SoundDisc({ soundId, avatarUrl, username, spinning }: {
  soundId: string;
  avatarUrl: string | null;
  username: string;
  spinning: boolean;
}) {
  return (
    <Link
      href={`/sounds/${soundId}`}
      aria-label="Open this sound"
      className={`pressable mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#1a1a1c] ring-[7px] ring-inset ring-[#2a2a2d] ${ON_VIDEO_SHADOW} animate-disc-spin`}
      style={{ animationPlayState: spinning ? "running" : "paused" }}
    >
      <Avatar username={username} avatarUrl={avatarUrl} className="h-5 w-5 text-[0.5rem]" />
    </Link>
  );
}

// A looping video never fires `ended`, so "watched all the way through"
// is detected via how far into the clip playback has gotten. 0.9 rather
// than 1.0 tolerates a video whose last frames never get a `timeupdate`
// tick before looping.
const COMPLETION_THRESHOLD = 0.9;

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
  tilt: number;
}

/** Hearts that land wherever the double-tap did, each at its own slight
 * angle, then float up and fade — the TikTok gesture, including tapping
 * a few in a row. */
function useFloatingHearts() {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const nextId = useRef(1);
  function spawn(x: number, y: number) {
    const id = nextId.current++;
    const tilt = Math.round(Math.random() * 40 - 20);
    setHearts((h) => [...h, { id, x, y, tilt }]);
    setTimeout(() => setHearts((h) => h.filter((heart) => heart.id !== id)), 1000);
  }
  const layer = (
    <>
      {hearts.map((h) => (
        <HeartIcon
          key={h.id}
          filled
          aria-hidden
          className="animate-heart-float pointer-events-none absolute h-24 w-24 text-accent drop-shadow-[0_4px_18px_rgb(0_0_0/0.45)]"
          style={{ left: h.x, top: h.y, "--heart-tilt": `${h.tilt}deg` } as React.CSSProperties}
        />
      ))}
    </>
  );
  return { spawn, layer };
}

export interface VideoMediaHandle {
  toggleMute: () => void;
  resumeAfterMenuClose: () => void;
}

const VideoMedia = forwardRef<VideoMediaHandle, {
  url: string;
  /** False until this slide has scrolled near the viewport — until then
   * `src` isn't set at all, so no request goes out (Supabase Storage
   * egress). */
  shouldLoad: boolean;
  postId: string;
  /** Skips completion tracking for a logged-out viewer. */
  trackCompletion: boolean;
  onDoubleTapLike: () => void;
  onLongPress: () => void;
  /** Mirrors `isMuted` up to the parent so PostContextMenu can label its
   * row — the mute itself lives here, since only this component holds
   * the video element and can flip `.muted` inside a real click. */
  onMutedChange: (muted: boolean) => void;
  onPlayingChange: (playing: boolean) => void;
}>(function VideoMedia(
  { url, shouldLoad, postId, trackCompletion, onDoubleTapLike, onLongPress, onMutedChange, onPlayingChange },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [scrub, setScrub] = useState<{ time: number; duration: number } | null>(null);
  const hasRecordedCompletion = useRef(false);
  const isIntersectingRef = useRef(false);
  const { spawn, layer: heartLayer } = useFloatingHearts();
  // WebKit (and Chrome) refuse to autoplay *unmuted* media until the page
  // has had a real user gesture, so the first video on a fresh launch had
  // nothing to play with sound and sat black. Falling back to muted keeps
  // it playing from the first frame; the long-press menu brings sound
  // back the moment a real gesture is available.
  const [isMuted, setIsMuted] = useState(false);

  useImperativeHandle(ref, () => ({
    toggleMute() {
      const el = videoRef.current;
      const next = !isMuted;
      setIsMuted(next);
      onMutedChange(next);
      if (!el) return;
      el.muted = next;
      // Runs inside the menu row's own click handler, so starting audible
      // playback is allowed here even if the automatic attempt wasn't.
      if (!next) el.play().catch(() => {});
    },
    resumeAfterMenuClose() {
      const el = videoRef.current;
      // Only if this slide is still the one on screen.
      if (!el || !isIntersectingRef.current) return;
      el.play().then(() => setIsPaused(false)).catch(() => {});
    },
  }), [isMuted, onMutedChange]);

  useEffect(() => {
    const el = videoRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersectingRef.current = entry.isIntersecting && entry.intersectionRatio > 0.6;
        if (isIntersectingRef.current) {
          el.play()
            .then(() => setIsPaused(false))
            .catch(() => {
              el.muted = true;
              setIsMuted(true);
              onMutedChange(true);
              el.play()
                .then(() => setIsPaused(false))
                .catch(() => setIsPaused(true));
            });
        } else {
          el.pause();
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onMutedChange is the parent's setState, stable enough that re-subscribing the observer on identity churn would be pure overhead
  }, []);

  // The progress line along the bottom. Driven from requestAnimationFrame
  // only while this video is actually playing — every slide in the feed
  // has one of these, and only one is ever on screen.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    let raf = 0;
    function tick() {
      const bar = progressFillRef.current;
      if (bar && el!.duration && Number.isFinite(el!.duration)) {
        bar.style.transform = `scaleX(${el!.currentTime / el!.duration})`;
      }
      raf = requestAnimationFrame(tick);
    }
    function onPlay() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
      onPlayingChange(true);
    }
    function onPause() {
      cancelAnimationFrame(raf);
      onPlayingChange(false);
    }
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onPlayingChange is the parent's setState
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
    spawn(lastTapRef.current.x, lastTapRef.current.y);
    onDoubleTapLike();
  });

  const { firedRef: longPressFiredRef, handlers: longPressHandlers } = useLongPress(() => {
    videoRef.current?.pause();
    setIsPaused(true);
    onLongPress();
  });

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    // The press that completed a long press also dispatches this click —
    // without this guard, opening the menu would toggle play underneath.
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    lastTapRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    handleTap();
  }

  function startScrub(e: React.PointerEvent<HTMLDivElement>) {
    const el = videoRef.current;
    if (!el || !el.duration || !Number.isFinite(el.duration)) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const duration = el.duration;
    const wasPaused = el.paused;
    el.pause();

    function seekTo(clientX: number) {
      const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      el!.currentTime = fraction * duration;
      if (progressFillRef.current) progressFillRef.current.style.transform = `scaleX(${fraction})`;
      setScrub({ time: fraction * duration, duration });
    }
    seekTo(e.clientX);
    function move(ev: PointerEvent) {
      seekTo(ev.clientX);
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setScrub(null);
      if (!wasPaused) el!.play().catch(() => {});
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  return (
    <div ref={containerRef} className="absolute inset-0" onClick={handleClick} {...longPressHandlers}>
      <video
        ref={videoRef}
        src={shouldLoad ? url : undefined}
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
      {isPaused && !scrub && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="animate-rise-in flex h-[72px] w-[72px] items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
            <PlayIcon className="ml-1 h-9 w-9 text-white/95" />
          </span>
        </div>
      )}
      {heartLayer}

      {scrub && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center">
          <span className="numeral rounded-full bg-black/45 px-3 py-1.5 text-[1rem] text-white backdrop-blur-xl">
            {formatClock(scrub.time)} <span className="text-white/50">/ {formatClock(scrub.duration)}</span>
          </span>
        </div>
      )}

      {/* The scrub line. A tall invisible touch target over a thin
          visible bar, which thickens while it's being dragged. */}
      <div
        onPointerDown={startScrub}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 z-[5] flex h-6 touch-none items-end"
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={scrub ? Math.round((scrub.time / scrub.duration) * 100) : 0}
      >
        <div
          className={`relative w-full overflow-hidden bg-white/20 transition-[height] duration-150 ${scrub ? "h-1.5" : "h-[2px]"}`}
        >
          <div ref={progressFillRef} className="h-full w-full origin-left scale-x-0 bg-white/90" />
        </div>
      </div>
    </div>
  );
});

/** A photo post has no audio track of its own, unlike a video — so an
 * attached sound actually plays here (looped, synced to on-screen
 * visibility via the same 60%-visible threshold VideoMedia uses). A video
 * post's attached sound is attribution only — its own audio plays.
 *
 * Browsers refuse to autoplay *audible* media from a non-gesture context,
 * so this falls back to muted playback the instant that happens, and the
 * caption's sound row carries a real tap-to-unmute. */
function PhotoMedia({
  urls,
  shouldLoad,
  soundUrl,
  soundStartMs,
  onLongPress,
  onDoubleTapLike,
  audioRef,
  onMutedChange,
}: {
  urls: string[];
  shouldLoad: boolean;
  soundUrl: string | null;
  /** Where in the attached sound to start — the part the poster picked. */
  soundStartMs: number;
  onLongPress: () => void;
  onDoubleTapLike: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onMutedChange: (muted: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const { spawn, layer: heartLayer } = useFloatingHearts();

  // Loops just the chosen window, not the whole file — see
  // use-sound-segment.ts. The `loop` attribute stays off the element.
  useSoundSegment(audioRef, soundStartMs);

  function handleScroll() {
    const el = containerRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  useEffect(() => {
    if (!soundUrl || !shouldLoad) return;
    const audio = audioRef.current;
    const container = containerRef.current;
    if (!audio || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          audio.play().catch(() => {
            // Audible autoplay was refused — muted autoplay never is.
            audio.muted = true;
            onMutedChange(true);
            audio.play().catch(() => {});
          });
        } else {
          audio.pause();
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onMutedChange is the parent's setState
  }, [soundUrl, shouldLoad, audioRef]);

  const handleTap = useDoubleTap(
    () => {},
    () => {
      spawn(lastTapRef.current.x, lastTapRef.current.y);
      onDoubleTapLike();
    },
  );
  const { firedRef, handlers: longPressHandlers } = useLongPress(onLongPress);

  return (
    <div
      className="absolute inset-0"
      onClick={(e) => {
        if (firedRef.current) {
          firedRef.current = false;
          return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        lastTapRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        handleTap();
      }}
      {...longPressHandlers}
    >
      {soundUrl && shouldLoad && <audio ref={audioRef} src={soundUrl} />}
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
      {heartLayer}
      {urls.length > 1 && (
        <div
          aria-label={`Photo ${index + 1} of ${urls.length}`}
          className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5"
        >
          {urls.map((url, i) => (
            <span
              key={`${url}-${i}`}
              className={`h-1.5 rounded-full shadow-[0_0_3px_rgb(0_0_0/0.5)] transition-all duration-300 ease-[var(--ease-ios)] ${
                i === index ? "w-4 bg-white" : "w-1.5 bg-white/45"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Two lines of caption, with the rest a tap away — and the scrim behind
 * it deepens when it opens so long text stays readable over any frame. */
function Caption({ text, onExpandedChange }: { text: string; onExpandedChange: (open: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (!expanded) setOverflows(el.scrollHeight > el.clientHeight + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, text]);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!overflows && !expanded) return;
    const next = !expanded;
    setExpanded(next);
    onExpandedChange(next);
  }

  return (
    <div onClick={toggle} className={overflows || expanded ? "cursor-pointer" : undefined}>
      <div
        ref={ref}
        className={`text-[0.9375rem] leading-snug text-white ${
          expanded ? "no-scrollbar max-h-[38vh] overflow-y-auto" : "line-clamp-2"
        }`}
      >
        <CaptionText text={text} className="whitespace-pre-line" />
      </div>
      {(overflows || expanded) && (
        <button type="button" onClick={toggle} className="mt-0.5 text-[0.875rem] font-semibold text-white/70">
          {expanded ? "less" : "more"}
        </button>
      )}
    </div>
  );
}

export function SwipeSlide({
  data,
  slideHeight = "h-[calc(100dvh-56px-64px)]",
  onBlocked,
}: {
  data: PostCardData;
  slideHeight?: string;
  /** Lets the surrounding list drop the blocked author's posts the moment
   * the block succeeds — see PostContextMenu. */
  onBlocked?: (authorId: string) => void;
}) {
  const isVideo = data.media[0]?.kind === "video";
  const containerRef = useRef<HTMLDivElement>(null);
  const videoMediaRef = useRef<VideoMediaHandle>(null);
  const photoAudioRef = useRef<HTMLAudioElement>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(data.commentCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);
  // Mirror of VideoMedia's own mute state, just for PostContextMenu's
  // label — see VideoMediaHandle.
  const [isMuted, setIsMuted] = useState(false);
  const [photoSoundMuted, setPhotoSoundMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOnScreen, setIsOnScreen] = useState(false);
  const [shouldLoadMedia, setShouldLoadMedia] = useState(false);
  const [likeBurst, setLikeBurst] = useState(0);
  // Local override so an edited caption shows immediately — `data` is a
  // snapshot from whichever server fetch produced this slide.
  const [captionOverride, setCaptionOverride] = useState<string | null | undefined>(undefined);
  const displayedCaption = captionOverride === undefined ? data.post.caption : captionOverride;
  const { liked, count: likeCount, toggle: toggleLike, like } = usePostLike(
    data.post.id,
    data.isLiked,
    data.likeCount,
  );

  function handleToggleLike() {
    if (!liked) setLikeBurst((n) => n + 1);
    toggleLike();
  }

  function handleDoubleTapLike() {
    if (!liked) setLikeBurst((n) => n + 1);
    like();
  }

  function closeMenu() {
    setMenuOpen(false);
    videoMediaRef.current?.resumeAfterMenuClose();
  }

  function togglePhotoSound(e: React.MouseEvent) {
    e.stopPropagation();
    const audio = photoAudioRef.current;
    const next = !photoSoundMuted;
    setPhotoSoundMuted(next);
    if (!audio) return;
    audio.muted = next;
    // A real click, so audible playback is allowed here even if the
    // automatic attempt was refused.
    if (!next) audio.play().catch(() => {});
  }

  useEffect(() => {
    // Every post the feed has fetched used to mount a real <video>/<img
    // src> the instant it rendered, regardless of whether it was ever
    // scrolled to — that drove Supabase Storage egress past 300% with a
    // handful of users. A generous rootMargin starts the request a bit
    // before the slide is on screen. Once true it stays true.
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
    const el = containerRef.current;
    if (!el) return;

    // Fires once per crossing into >60% visible, so scrolling away and
    // back attempts a new view each time. The cooldown that prevents
    // over-counting lives server-side (recordPostView).
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio > 0.6;
        setIsOnScreen(visible);
        if (visible && data.isAuthenticated) recordViewAction(data.post.id);
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [data.isAuthenticated, data.post.id]);

  const discSpinning = isVideo ? isPlaying : isOnScreen;

  return (
    <div
      ref={containerRef}
      className={`relative ${slideHeight} w-full flex-shrink-0 snap-start overflow-hidden bg-black`}
    >
      {data.media.length > 0 &&
        (isVideo ? (
          <VideoMedia
            ref={videoMediaRef}
            url={data.media[0].url}
            shouldLoad={shouldLoadMedia}
            postId={data.post.id}
            trackCompletion={data.isAuthenticated}
            onDoubleTapLike={handleDoubleTapLike}
            onLongPress={() => setMenuOpen(true)}
            onMutedChange={setIsMuted}
            onPlayingChange={setIsPlaying}
          />
        ) : (
          <PhotoMedia
            urls={data.media.map((m) => m.url)}
            shouldLoad={shouldLoadMedia}
            soundUrl={data.soundUrl}
            soundStartMs={data.soundStartMs}
            onLongPress={() => setMenuOpen(true)}
            onDoubleTapLike={handleDoubleTapLike}
            audioRef={photoAudioRef}
            onMutedChange={setPhotoSoundMuted}
          />
        ))}

      {/* Scrims: a light one under the floating top bar, and one along
          the bottom under the caption that deepens when it opens. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/40 to-transparent" />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t transition-[height,opacity] duration-300 ${
          captionOpen ? "h-[70%] from-black/85 via-black/55 to-transparent" : "h-[45%] from-black/70 via-black/20 to-transparent"
        }`}
      />

      <PostContextMenu
        open={menuOpen}
        onClose={closeMenu}
        postId={data.post.id}
        authorId={data.authorId}
        authorUsername={data.authorUsername}
        caption={displayedCaption}
        onCaptionUpdated={setCaptionOverride}
        onBlocked={onBlocked}
        isOwnPost={data.isOwnPost}
        canReport={data.isAuthenticated && !data.isOwnPost}
        showMuteToggle={isVideo}
        isMuted={isMuted}
        onToggleMute={() => videoMediaRef.current?.toggleMute()}
      />

      {/* Who, what car, what they said, what's playing. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-5">
        <div className="pointer-events-auto min-w-0 max-w-[calc(100%-4.75rem)] text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.5)]">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/u/${data.authorUsername}?from=${data.post.id}`}
              className="truncate text-[1.0625rem] font-bold tracking-[-0.01em]"
            >
              {data.authorUsername}
            </Link>
            {data.authorIsVerified && <VerifiedBadge onMedia className="h-[17px] w-[17px]" />}
            <span className="flex-shrink-0 text-[0.8125rem] text-white/60" suppressHydrationWarning>
              · {relativeTime(data.post.created_at)}
            </span>
          </div>

          {data.vehicleTitle && data.post.vehicle_id && (
            <Link
              href={`/garage/${data.post.vehicle_id}?from=${data.post.id}`}
              className="pressable mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/15 py-1 pl-2 pr-2.5 text-[0.8125rem] font-semibold backdrop-blur-md [text-shadow:none]"
            >
              <WheelIcon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{data.vehicleTitle}</span>
            </Link>
          )}

          {displayedCaption && (
            <div className="mt-1.5">
              <Caption text={displayedCaption} onExpandedChange={setCaptionOpen} />
            </div>
          )}

          <div className="mt-2 flex items-center gap-3 text-[0.8125rem] text-white/85">
            {data.soundTitle && data.soundId ? (
              <div className="flex min-w-0 items-center gap-1.5">
                {!isVideo && data.soundUrl ? (
                  <button
                    type="button"
                    onClick={togglePhotoSound}
                    aria-label={photoSoundMuted ? "Turn sound on" : "Turn sound off"}
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-md"
                  >
                    <VolumeIcon muted={photoSoundMuted} className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <MusicIcon className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                <Link href={`/sounds/${data.soundId}`} className="min-w-0 max-w-[13rem] overflow-hidden">
                  <span className={`flex w-max gap-8 whitespace-nowrap ${data.soundTitle.length > 24 ? "animate-marquee" : ""}`}>
                    <span>{data.soundTitle}</span>
                    {data.soundTitle.length > 24 && <span aria-hidden>{data.soundTitle}</span>}
                  </span>
                </Link>
              </div>
            ) : null}
            <span className="flex flex-shrink-0 items-center gap-1 text-white/60">
              <EyeIcon className="h-3.5 w-3.5" />
              <span className="numeral">{formatCompactNumber(data.viewCount)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* The action rail. */}
      <div className="absolute bottom-5 right-2 flex w-14 flex-col items-center gap-3.5">
        <div className="relative mb-2">
          <Link href={`/u/${data.authorUsername}?from=${data.post.id}`} aria-label={`@${data.authorUsername}'s profile`}>
            <RankFrame score={data.authorBestRatingScore} compact hideBadge className="rounded-full">
              <Avatar
                username={data.authorUsername}
                avatarUrl={data.authorAvatarUrl}
                className="h-12 w-12 border-[1.5px] border-white text-base"
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

        <LikeAction
          liked={liked}
          count={likeCount}
          onToggle={handleToggleLike}
          isAuthenticated={data.isAuthenticated}
          burstKey={likeBurst}
        />

        <RailAction
          onClick={() => setCommentsOpen(true)}
          label="Comments"
          caption={commentCount > 0 ? formatCompactNumber(commentCount) : null}
        >
          <CommentIcon className="h-[31px] w-[31px]" strokeWidth={1.9} />
        </RailAction>

        <SaveButton
          postId={data.post.id}
          initialSaved={data.isSaved}
          initialCount={data.saveCount}
          isAuthenticated={data.isAuthenticated}
          variant="rail"
        />

        <ShareAction postId={data.post.id} />

        {data.soundId && (
          <SoundDisc
            soundId={data.soundId}
            avatarUrl={data.authorAvatarUrl}
            username={data.authorUsername}
            spinning={discSpinning}
          />
        )}
      </div>

      <CommentSheet
        postId={data.post.id}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        isAuthenticated={data.isAuthenticated}
        initialCount={data.commentCount}
        onCountChange={setCommentCount}
      />
    </div>
  );
}
