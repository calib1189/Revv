"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { publicSoundUrl, type Sound } from "@/lib/db/sounds";
import { SOUND_CLIP_MS, clampSoundStartMs } from "@/lib/validation/sound";
import { StudioSheet } from "@/features/editor/studio-ui";
import { SoundCover } from "@/features/sounds/sound-cover";
import { useWaveformPeaks, WaveformTrimmer } from "@/features/sounds/sound-waveform";
import { PlayIcon, PauseIcon } from "@/components/ui/icons";

/** The "which part of the song" picker — opens right after choosing a
 * sound for a photo post (and again from the post screen's sound row).
 * Drag the window across the track's real waveform; the preview loops
 * exactly that window as it moves, so what you hear here is exactly what
 * plays behind the post. */
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
  const [startMs, setStartMs] = useState(() => clampSoundStartMs(initialStartMs, sound.duration_ms));
  const [isPlaying, setIsPlaying] = useState(false);
  const [url] = useState(() => publicSoundUrl(createClient(), sound.storage_path));
  const peaks = useWaveformPeaks(url, `sound:${sound.id}`);

  const getPlaybackMs = useCallback(() => {
    const audio = audioRef.current;
    return audio && !audio.paused ? audio.currentTime * 1000 : null;
  }, []);

  // Loops the chosen window while this sheet stays open, and jumps to the
  // new window the instant it moves — so dragging previews the part being
  // looked at, not wherever playback happened to be.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const startSeconds = startMs / 1000;
    const endSeconds = Math.min(sound.duration_ms, startMs + SOUND_CLIP_MS) / 1000;

    function seekToStart() {
      audio!.currentTime = startSeconds;
    }
    function onTimeUpdate() {
      if (audio!.currentTime >= endSeconds || audio!.currentTime < startSeconds - 0.25) seekToStart();
    }
    if (audio.readyState >= 1) seekToStart();
    audio.addEventListener("loadedmetadata", seekToStart);
    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      audio.removeEventListener("loadedmetadata", seekToStart);
      audio.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [startMs, sound.duration_ms]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => setIsPlaying(false));
    }
  }

  return (
    <StudioSheet onClose={onClose}>
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center gap-3 pb-5">
        <SoundCover seed={sound.id} playing={isPlaying} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[1.0625rem] font-semibold">{sound.title}</p>
          <p className="truncate text-[0.8125rem] text-white/50">{sound.artist_name || "Unknown artist"}</p>
        </div>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause preview" : "Play preview"}
          className="pressable flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white text-black"
        >
          {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="ml-0.5 h-5 w-5" />}
        </button>
      </div>

      <WaveformTrimmer
        peaks={peaks}
        durationMs={sound.duration_ms}
        windowMs={SOUND_CLIP_MS}
        startMs={startMs}
        onChange={setStartMs}
        getPlaybackMs={getPlaybackMs}
      />

      <button
        type="button"
        onClick={() => onConfirm(startMs)}
        className="pressable mt-6 h-[52px] w-full rounded-full bg-accent text-[1rem] font-semibold text-white"
      >
        Use this part
      </button>
    </StudioSheet>
  );
}
