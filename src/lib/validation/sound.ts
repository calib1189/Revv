/** How much of a sound actually plays behind a post — a fixed window
 * rather than looping the whole (up to 5-minute) upload, TikTok-style.
 * Applies to playback (swipe-slide.tsx's PhotoMedia, post-sound-player.tsx)
 * and to the composer's trim picker (sound-trim-sheet.tsx), which is what
 * lets someone actually choose which part that window covers. */
export const SOUND_CLIP_MS = 15_000;

/** Clamps a chosen start point so a full SOUND_CLIP_MS window always
 * fits inside the sound — e.g. dragging near the very end of a 20s sound
 * snaps back to 5s in, not to a start point that would mostly play past
 * the sound's real end. A sound shorter than one clip always starts at 0.
 * Also the source of truth for validating `posts.sound_start_ms` server-
 * side (createPost never trusts a client-supplied offset as-is). */
export function clampSoundStartMs(startMs: number, durationMs: number): number {
  const maxStart = Math.max(0, durationMs - SOUND_CLIP_MS);
  if (!Number.isFinite(startMs)) return 0;
  return Math.min(Math.max(0, Math.round(startMs)), maxStart);
}

export interface SoundFormInput {
  title: string;
  artistName: string;
}

export interface SoundFormErrors {
  title?: string;
  artistName?: string;
}

export function validateSoundForm(input: SoundFormInput): SoundFormErrors {
  const errors: SoundFormErrors = {};

  const title = input.title.trim();
  if (title.length < 1) {
    errors.title = "Give this sound a name.";
  } else if (title.length > 80) {
    errors.title = "Name must be 80 characters or fewer.";
  }

  if (input.artistName.trim().length > 80) {
    errors.artistName = "Artist name must be 80 characters or fewer.";
  }

  return errors;
}
