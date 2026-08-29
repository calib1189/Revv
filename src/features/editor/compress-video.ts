/**
 * Compresses an oversized/high-resolution video (4K, 120fps — anything
 * too large to post as-is) down to a normal, postable file. Runs
 * entirely on-device via ffmpeg.wasm rather than the app's own
 * canvas.captureStream() + MediaRecorder re-encode path
 * (use-video-export.ts) — that path has to decode the full source
 * resolution every frame in real time, which is a genuine hardware
 * ceiling on a lot of phones for 4K/120fps, and has been confirmed to
 * fail outright (a clean recorder stop with zero captured data) on at
 * least one real device. ffmpeg.wasm does the same job as offline
 * software transcoding instead of a live real-time capture, which is a
 * fundamentally different (slower, but far more reliable) technique
 * with no dependency on the browser's own streaming/recording APIs at
 * all — it can't hit that specific failure mode because it never uses
 * MediaRecorder or captureStream() in the first place.
 *
 * The core WASM files are self-hosted from /public/ffmpeg (copied from
 * the single-threaded @ffmpeg/core build, not loaded from a CDN) so
 * this doesn't depend on a third party staying up, and specifically
 * NOT the multi-threaded core — that variant needs
 * crossOriginIsolation (COOP/COEP response headers) set site-wide,
 * which breaks other cross-origin flows this app depends on (Google/
 * Apple OAuth popups, embedded Supabase Storage images). Single-
 * threaded is slower but has zero deployment footprint beyond serving
 * two static files.
 */

import { fetchFile } from "@ffmpeg/util";
import { getFFmpeg } from "@/features/editor/ffmpeg-instance";

export interface CompressVideoOptions {
  /** Called with 0-1 while the ~31MB WASM core is downloading/initializing. */
  onLoadProgress?: (ratio: number) => void;
  /** Called with 0-1 during the actual transcode. */
  onCompressProgress?: (ratio: number) => void;
}

/** Scales down to a ~720p-equivalent target and re-encodes at a
 * moderate, broadly-compatible bitrate — matching what the app's own
 * canvas-based export already targets for everything else, so a
 * compressed file behaves the same as a normal edited export
 * everywhere downstream (moderation, upload, playback). "-2" keeps
 * whichever dimension isn't explicitly capped even (a codec
 * requirement), rounding down rather than up. */
const SCALE_FILTER = "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2";

export async function compressVideo(file: File, options: CompressVideoOptions = {}): Promise<File> {
  const ffmpeg = await getFFmpeg(options.onLoadProgress);

  const inputName = "input" + (file.name.match(/\.\w+$/)?.[0] ?? ".mp4");
  const outputName = "output.mp4";

  const onProgress = options.onCompressProgress;
  const progressHandler = onProgress
    ? ({ progress }: { progress: number }) => {
        // ffmpeg reports progress as a fraction of the estimated total
        // duration — it can briefly overshoot 1 near the end of a
        // transcode, so this clamps rather than let a progress bar
        // visibly exceed 100%.
        onProgress(Math.max(0, Math.min(1, progress)));
      }
    : undefined;
  if (progressHandler) ffmpeg.on("progress", progressHandler);

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    const exitCode = await ffmpeg.exec([
      "-i",
      inputName,
      "-vf",
      SCALE_FILTER,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "26",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputName,
    ]);
    if (exitCode !== 0) {
      throw new Error(`ffmpeg exited with code ${exitCode}`);
    }

    const data = await ffmpeg.readFile(outputName);
    // Re-wrapped into a fresh, plain-ArrayBuffer-backed Uint8Array —
    // ffmpeg.wasm's readFile() return type allows a SharedArrayBuffer
    // backing, which Blob/File's constructor type doesn't accept even
    // though the runtime value is fine.
    const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new TextEncoder().encode(data);
    return new File([bytes], "compressed.mp4", { type: "video/mp4" });
  } finally {
    if (progressHandler) ffmpeg.off("progress", progressHandler);
    // Best-effort cleanup — a failed write/exec might mean one or both
    // names were never created, which deleteFile would throw on.
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}
