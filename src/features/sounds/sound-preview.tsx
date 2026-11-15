"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SoundCover } from "@/features/sounds/sound-cover";
import { Avatar } from "@/features/feed/avatar";
import { BackIcon, PauseIcon, PlayIcon } from "@/components/ui/icons";

export interface SoundOwner {
  username: string;
  avatarUrl: string | null;
}

/** An original sound's cover: the poster's profile picture as the label
 * of a turning record, like the disc on their video in the feed. */
function RecordCover({ owner }: { owner: SoundOwner }) {
  return (
    <span
      aria-hidden
      className="animate-disc-spin relative flex h-[6.5rem] w-[6.5rem] items-center justify-center rounded-full shadow-[0_6px_20px_rgb(0_0_0/0.45)] ring-1 ring-white/10"
      style={{
        // Fine grooves with a soft highlight across them, as in the feed.
        background:
          "conic-gradient(from 30deg, rgb(255 255 255 / 0.10), transparent 18%, transparent 50%, rgb(255 255 255 / 0.08) 62%, transparent 80%), repeating-radial-gradient(circle, #19191b 0 1.5px, #242427 1.5px 3px)",
      }}
    >
      <Avatar
        username={owner.username}
        avatarUrl={owner.avatarUrl}
        className="h-[3.75rem] w-[3.75rem] text-[1.375rem] ring-[3px] ring-black/60"
      />
    </span>
  );
}

/** The sound's cover, which plays the sound itself when tapped (from the
 * part a poster would hear first) and stops when you leave the page. An
 * original sound (a video's own audio) shows its poster on a record. */
export function SoundPreview({
  soundId,
  url,
  title,
  owner = null,
}: {
  soundId: string;
  url: string;
  title: string;
  owner?: SoundOwner | null;
}) {
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
      {owner ? <RecordCover owner={owner} /> : <SoundCover seed={soundId} playing={playing} size="xl" />}
      <span className={`absolute ${owner ? "bottom-0 right-0" : "bottom-1.5 right-1.5"} flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md`}>
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
