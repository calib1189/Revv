/** Below this peak (about -40 dB) a track is treated as silent: a video
 * whose original sound was turned all the way down still carries an
 * audio track, just an empty one, and that shouldn't become a sound. */
export const SILENCE_PEAK = 0.01;

/** True when no sample in any channel reaches the threshold. */
export function isSilent(channels: ArrayLike<number>[], threshold = SILENCE_PEAK): boolean {
  for (const samples of channels) {
    for (let i = 0; i < samples.length; i += 1) {
      const s = samples[i];
      if (s >= threshold || s <= -threshold) return false;
    }
  }
  return true;
}
