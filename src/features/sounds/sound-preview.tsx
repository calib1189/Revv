"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SoundCover } from "@/features/sounds/sound-cover";
import { BackIcon, PauseIcon, PlayIcon } from "@/components/ui/icons";

/** The sound's cover, which plays the sound itself when tapped (from the
 * part a poster would hear first) and stops when you leave the page. */
export function SoundPreview({ soundId, url, title }: { soundId: string; url: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    audio.play().catch(() => setPlaying(false));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? `Pause ${title}` : `Play ${title}`}
      className="pressable relative flex-shrink-0"
    >
      <SoundCover seed={soundId} playing={playing} size="xl" />
      <span className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md">
        {playing ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="ml-0.5 h-3.5 w-3.5" />}
      </span>
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </button>
  );
}

/** Back to wherever you tapped the sound from (the feed, usually), or to
 * Discover if the page was opened directly. */
export function SoundBackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/discover"))}
      aria-label="Back"
      className="pressable -ml-2 flex h-10 w-10 items-center justify-center rounded-full text-foreground"
    >
      <BackIcon className="h-6 w-6" />
    </button>
  );
}
