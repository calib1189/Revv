import { useEffect, type RefObject } from "react";
import { SOUND_CLIP_MS } from "@/lib/validation/sound";

/** Keeps an `<audio>` element looping just the chosen SOUND_CLIP_MS
 * window of the attached sound — starting at `startMs`, not necessarily
 * the top of the file — instead of the native `loop` attribute, which
 * only ever loops the whole track back to 0. Callers must NOT set the
 * `loop` attribute on the element themselves; this re-seeks manually via
 * `timeupdate` (and `ended` as a fallback for the edge case where the
 * window reaches the sound's real end, which does fire a natural
 * `ended`). Safe to call with a null/not-yet-mounted ref. */
export function useSoundSegment(audioRef: RefObject<HTMLAudioElement | null>, startMs: number) {
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const startSeconds = Math.max(0, startMs) / 1000;
    const endSeconds = startSeconds + SOUND_CLIP_MS / 1000;

    function seekToStart() {
      audio!.currentTime = startSeconds;
    }
    function onTimeUpdate() {
      if (audio!.currentTime >= endSeconds || audio!.currentTime < startSeconds) {
        seekToStart();
      }
    }
    // Belt-and-suspenders for the one case `timeupdate` (which only
    // fires a few times a second) can miss: the window's end lands right
    // at the sound's real end, and the browser reaches it first. A
    // natural `ended` always pauses the element — re-seeking alone would
    // leave it silently stopped forever, so this also resumes it.
    function onEnded() {
      seekToStart();
      audio!.play().catch(() => {});
    }

    // Metadata (and therefore a real duration/seekable range) may not be
    // loaded yet on first mount — seeking before then is a no-op in every
    // browser, so this covers both "already ready" and "wire it up for
    // when it becomes ready."
    if (audio.readyState >= 1) seekToStart();
    audio.addEventListener("loadedmetadata", seekToStart);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", seekToStart);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioRef, startMs]);
}
