"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { publicSoundUrl, type Sound } from "@/lib/db/sounds";
import { SOUND_CLIP_MS, clampSoundStartMs } from "@/lib/validation/sound";
import { Button } from "@/components/ui/button";
import { CloseIcon, PlayIcon, PauseIcon } from "@/components/ui/icons";

function formatClock(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** The "which part of the song" picker — opens right after choosing a
 * sound (and re-openable from the composer's sound row afterward). Drag
 * the slider to move a fixed SOUND_CLIP_MS window over the track; the
 * preview loops exactly that window as it moves, so what you hear here
 * is exactly what plays behind the post. */
export function SoundTrimSheet({
  sound,
  initialStartMs,
  onConfirm,
  onClose,
}: {
  sound: Sound;
  initialStartMs: number;
  onConfirm: (startMs: number) => void;
  onClose: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const maxStart = Math.max(0, sound.duration_ms - SOUND_CLIP_MS);
  const [startMs, setStartMs] = useState(() => clampSoundStartMs(initialStartMs, sound.duration_ms));
  const [isPlaying, setIsPlaying] = useState(false);
  const url = publicSoundUrl(createClient(), sound.storage_path);

  // Loops the currently-chosen window while this sheet stays open, and
  // jumps to the new window the instant the slider moves — so dragging
  // previews the part you're looking at, not wherever playback happened
  // to be when you started dragging.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const startSeconds = startMs / 1000;
    const endSeconds = Math.min(sound.duration_ms, startMs + SOUND_CLIP_MS) / 1000;

    function seekToStart() {
      audio!.currentTime = startSeconds;
    }
    function onTimeUpdate() {
      if (audio!.currentTime >= endSeconds || audio!.currentTime < startSeconds) seekToStart();
    }
    if (audio.readyState >= 1) seekToStart();
    audio.addEventListener("loadedmetadata", seekToStart);
    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      audio.removeEventListener("loadedmetadata", seekToStart);
      audio.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [startMs, sound.duration_ms]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center">
      <div className="glass-raised relative flex w-full max-w-md flex-col gap-5 rounded-t-[2rem] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-2xl">
        <audio ref={audioRef} src={url} onEnded={() => setIsPlaying(false)} />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Choose this part</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-foreground"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause preview" : "Play preview"}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
          >
            {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{sound.title}</p>
            {sound.artist_name && <p className="truncate text-xs text-muted">{sound.artist_name}</p>}
          </div>
        </div>

        <div>
          <input
            type="range"
            min={0}
            max={maxStart}
            step={500}
            value={startMs}
            disabled={maxStart === 0}
            onChange={(e) => setStartMs(Number(e.target.value))}
            aria-label="Starting point in the song"
            className="w-full accent-accent disabled:opacity-40"
          />
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
            <span className="tabular-nums">{formatClock(startMs)}</span>
            <span>{Math.round(SOUND_CLIP_MS / 1000)}s clip</span>
            <span className="tabular-nums">
              {formatClock(Math.min(sound.duration_ms, startMs + SOUND_CLIP_MS))}
            </span>
          </div>
          {maxStart === 0 && (
            <p className="mt-2 text-xs text-muted">
              This sound is short enough to play from the start every time.
            </p>
          )}
        </div>

        <Button type="button" onClick={() => onConfirm(startMs)} className="w-full py-3 text-base">
          Use this part
        </Button>
      </div>
    </div>
  );
}
