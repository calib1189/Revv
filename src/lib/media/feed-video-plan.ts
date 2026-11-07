/** Decides whether a video is worth re-encoding before it's posted, and
 * at what size and bitrate.
 *
 * Every view of a post streams the whole file from Supabase Storage, and
 * that bandwidth is the main thing that runs past the plan's quota. Raw
 * phone clips and MediaRecorder exports often land at 8-16 Mbps, which is
 * far more than a phone screen needs. Instagram Reels plays 1080p at
 * roughly 3-5 Mbps.
 *
 * The rules aim to save bandwidth without a visible loss in quality:
 * - Resolution is only reduced above 1080 on the short side (4K), never
 *   below it.
 * - The bitrate target is generous for a phone screen.
 * - Clips already near or under the cap are left alone. Re-encoding them
 *   would only cost quality and the poster's time. */

/** Short-side ceiling. 1080p is what phones display at full sharpness. */
const MAX_SHORT_SIDE = 1080;
/** Only re-encode when the file is this far over the cap. */
const OVER_CAP_FACTOR = 1.3;
/** Audio stays AAC at this bitrate. */
export const FEED_AUDIO_BITRATE = 128_000;

/** About 6 Mbps at 1080x1920 and about 3.5 Mbps at 720x1280. Set a step
 * above Instagram's because a phone's hardware encoder, which does the
 * encode, needs more bits than x264 for the same picture. At 5 Mbps,
 * asphalt grain visibly softened in testing. */
export function feedVideoMaxBitrate(width: number, height: number): number {
  return Math.round(1_500_000 + width * height * 2.2);
}

export interface FeedVideoPlan {
  width: number;
  height: number;
  /** Video bitrate target in bits per second. */
  maxBitrate: number;
}

function even(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

export function planFeedVideo(source: {
  width: number;
  height: number;
  durationMs: number;
  bytes: number;
}): FeedVideoPlan | null {
  const { width, height, durationMs, bytes } = source;
  if (!(width > 0 && height > 0 && durationMs > 0 && bytes > 0)) return null;

  const shortSide = Math.min(width, height);
  const scale = Math.min(1, MAX_SHORT_SIDE / shortSide);
  const outWidth = scale < 1 ? even(width * scale) : even(width);
  const outHeight = scale < 1 ? even(height * scale) : even(height);
  const maxBitrate = feedVideoMaxBitrate(outWidth, outHeight);

  const bitrate = (bytes * 8) / (durationMs / 1000);
  const oversized = scale < 1;
  const overCap = bitrate > (maxBitrate + FEED_AUDIO_BITRATE) * OVER_CAP_FACTOR;
  if (!oversized && !overCap) return null;

  return { width: outWidth, height: outHeight, maxBitrate };
}

/** A re-encode that barely shrinks the file isn't worth its quality cost. */
export function isWorthKeeping(originalBytes: number, shrunkBytes: number): boolean {
  return shrunkBytes > 0 && shrunkBytes <= originalBytes * 0.85;
}
