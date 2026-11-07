/**
 * Re-encodes a finished clip to a feed-sized file before it's uploaded,
 * so every later view streams far fewer bytes from Supabase Storage.
 * planFeedVideo (lib/media/feed-video-plan.ts) decides whether it's
 * needed and at what size and bitrate. This file only runs the encode.
 *
 * It uses Mediabunny on top of WebCodecs, which means the device's own
 * hardware H.264 encoder: usually as fast as the clip's length or faster.
 * The app's ffmpeg.wasm encoder was measured at about 2 minutes for a
 * 17-second 1080p clip on a desktop, too slow to make someone wait for
 * before posting.
 *
 * Quality choices:
 * - Resolution is kept up to 1080 on the short side.
 * - Constant bitrate at about 6 Mbps for 1080p (see feedVideoMaxBitrate).
 *   In testing, variable mode let the hardware encoder ignore the target
 *   and return a file bigger than the original.
 * - Frame rate is kept as-is.
 * - HDR footage (iPhone records HLG by default) is drawn through a 2D
 *   canvas, which the browser color-manages down to SDR. This is the same
 *   path the editor's own export uses. Encoding HDR frames straight to
 *   8-bit H.264 comes out grey and washed out.
 *
 * It never makes posting worse than before. If the browser can't do it,
 * any track would be dropped (a silent video is never acceptable), or
 * the result isn't meaningfully smaller, the original file is returned
 * and posted exactly as it would have been.
 */

import {
  MATROSKA,
  MP4,
  QTFF,
  WEBM,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  canEncodeVideo,
  type VideoSample,
} from "mediabunny";
import { FEED_AUDIO_BITRATE, isWorthKeeping, planFeedVideo } from "@/lib/media/feed-video-plan";

export interface ShrinkVideoOptions {
  /** Called once an encode will actually happen, so the UI can show it. */
  onStart?: () => void;
  /** 0-1 during the encode. */
  onProgress?: (ratio: number) => void;
  /** Why the original was kept instead, for diagnostics. */
  onSkip?: (reason: string) => void;
}

/** Phone clips (.mov/.mp4) and MediaRecorder exports (.mp4/.webm). Listed
 * instead of ALL_FORMATS so audio-only demuxers stay out of the bundle. */
const VIDEO_FORMATS = [MP4, QTFF, WEBM, MATROSKA];

/** Draws each HDR frame onto an sRGB canvas, which tone-maps it to SDR. */
function sdrCanvasProcessor(width: number, height: number) {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { colorSpace: "srgb" });
  if (!ctx) throw new Error("No 2D canvas for HDR conversion.");
  return (sample: VideoSample) => {
    sample.draw(ctx, 0, 0, width, height);
    return canvas;
  };
}

export async function shrinkVideoForFeed(file: File, options: ShrinkVideoOptions = {}): Promise<File> {
  const skip = (reason: string) => {
    options.onSkip?.(reason);
    return file;
  };
  if (typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined") return skip("no WebCodecs");

  let input: Input | null = null;
  try {
    input = new Input({ source: new BlobSource(file), formats: VIDEO_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) return skip("can't decode");

    const plan = planFeedVideo({
      width: await track.getDisplayWidth(),
      height: await track.getDisplayHeight(),
      durationMs: (await input.computeDuration()) * 1000,
      bytes: file.size,
    });
    if (!plan) return skip("already lean");
    if (!(await canEncodeVideo("avc", { width: plan.width, height: plan.height, bitrate: plan.maxBitrate }))) {
      return skip("can't encode H.264");
    }
    const hdr = await track.hasHighDynamicRange();

    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target });
    const conversion = await Conversion.init({
      input,
      output,
      tracks: "primary",
      video: {
        codec: "avc",
        width: plan.width,
        height: plan.height,
        fit: "contain",
        quality: new Quality({ bitrate: plan.maxBitrate, bitrateMode: "constant" }),
        // Bake rotation into the frames, so every player and the upload's
        // own width/height reading agree on which way is up.
        allowTransformationMetadata: false,
        forceTranscode: true,
        ...(hdr
          ? { process: sdrCanvasProcessor(plan.width, plan.height), processedWidth: plan.width, processedHeight: plan.height }
          : {}),
      },
      // AAC is copied as-is when it already is AAC, so there's no
      // second-generation loss on the sound.
      audio: { codec: "aac", quality: new Quality({ bitrate: FEED_AUDIO_BITRATE }) },
    });
    if (!conversion.isValid || conversion.discardedTracks.length > 0) {
      return skip(`tracks dropped: ${conversion.discardedTracks.map((t) => t.reason).join(", ") || "invalid"}`);
    }

    options.onStart?.();
    conversion.onProgress = (progress) => options.onProgress?.(Math.max(0, Math.min(1, progress)));
    await conversion.execute();

    const buffer = target.buffer;
    if (!buffer || !isWorthKeeping(file.size, buffer.byteLength)) {
      return skip(`not smaller enough (${buffer?.byteLength ?? 0} of ${file.size} bytes)`);
    }
    return new File([buffer], "sorza-clip.mp4", { type: "video/mp4" });
  } catch (err) {
    return skip(err instanceof Error ? err.message : String(err));
  } finally {
    input?.dispose();
  }
}
