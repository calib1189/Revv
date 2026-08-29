/**
 * Combines multiple video clips into one file entirely via ffmpeg.wasm —
 * replaces the earlier canvas.captureStream() + MediaRecorder approach
 * (use-clip-combiner.ts), which played each clip in real time and
 * re-recorded the canvas, the same real-time-encode technique
 * documented as unreliable everywhere else in this file's neighbors
 * (use-video-export.ts, camera-recorder.tsx). That approach kept
 * failing ("Combining produced no data") even after lowering its
 * target resolution/bitrate to match the one proven-working real-time
 * path — a strong sign the failure wasn't really about resolution or
 * bitrate at all, but the fundamental unreliability of asking a real
 * device to encode a live canvas stream on demand. ffmpeg.wasm software-
 * transcodes offline instead, the same fundamentally more reliable
 * technique compress-video.ts already uses for oversized single clips,
 * and never touches MediaRecorder or captureStream() at all.
 *
 * Every clip is scaled and center-cropped ("cover") into the same fixed
 * 720x1280 (9:16) frame regardless of its own resolution or aspect —
 * matching the old combiner's own "cover" treatment (drawCover), and a
 * reasonable target either way since the video editor this feeds into
 * re-crops/re-encodes at export time regardless of what this produces.
 * Assumes every clip has an audio track, same as the old combiner
 * implicitly did — every clip actually recorded in this app's own
 * camera always has one (see camera-recorder.tsx's AudioContext
 * bridging), so this only matters for a rare externally-sourced silent
 * clip, and that case gets a clear, specific error instead of an
 * opaque one.
 */

import { fetchFile } from "@ffmpeg/util";
import { getFFmpeg } from "@/features/editor/ffmpeg-instance";

const TARGET_WIDTH = 720;
const TARGET_HEIGHT = 1280;

function coverScaleFilter(label: string): string {
  return (
    `scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=increase,` +
    `crop=${TARGET_WIDTH}:${TARGET_HEIGHT},setsar=1,fps=30[${label}]`
  );
}

export interface CombineClipsOptions {
  onLoadProgress?: (ratio: number) => void;
  onCombineProgress?: (ratio: number) => void;
}

export interface CombineClipsResult {
  file: File;
}

export async function combineClipsFfmpeg(
  files: File[],
  options: CombineClipsOptions = {},
): Promise<CombineClipsResult> {
  if (files.length < 2) {
    throw new Error("Pick at least two clips to combine.");
  }

  const ffmpeg = await getFFmpeg(options.onLoadProgress);

  const inputNames = files.map((file, i) => `clip${i}` + (file.name.match(/\.\w+$/)?.[0] ?? ".mp4"));
  const outputName = "combined.mp4";

  const onProgress = options.onCombineProgress;
  const progressHandler = onProgress
    ? ({ progress }: { progress: number }) => onProgress(Math.max(0, Math.min(1, progress)))
    : undefined;
  if (progressHandler) ffmpeg.on("progress", progressHandler);

  try {
    for (let i = 0; i < files.length; i++) {
      await ffmpeg.writeFile(inputNames[i], await fetchFile(files[i]));
    }

    const n = files.length;
    const videoLabels: string[] = [];
    const audioLabels: string[] = [];
    const filterParts: string[] = [];
    for (let i = 0; i < n; i++) {
      filterParts.push(`[${i}:v]${coverScaleFilter(`v${i}`)}`);
      filterParts.push(`[${i}:a]aresample=44100,aformat=channel_layouts=stereo[a${i}]`);
      videoLabels.push(`[v${i}]`);
      audioLabels.push(`[a${i}]`);
    }
    const interleaved = Array.from({ length: n }, (_, i) => `${videoLabels[i]}${audioLabels[i]}`).join("");
    filterParts.push(`${interleaved}concat=n=${n}:v=1:a=1[outv][outa]`);
    const filterComplex = filterParts.join(";");

    const args = [
      ...inputNames.flatMap((name) => ["-i", name]),
      "-filter_complex",
      filterComplex,
      "-map",
      "[outv]",
      "-map",
      "[outa]",
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
    ];

    const exitCode = await ffmpeg.exec(args);
    if (exitCode !== 0) {
      // The single most common way this fails in practice: one of the
      // picked clips has no audio track at all, so `[i:a]` above doesn't
      // exist and ffmpeg exits non-zero immediately. There's no cheap
      // way to tell that apart from other failures without parsing
      // ffmpeg's own stderr log more thoroughly than this reads it, so
      // this names the likely cause rather than claiming certainty.
      throw new Error(
        `ffmpeg exited with code ${exitCode} — check that every clip has audio (silent clips aren't supported yet).`,
      );
    }

    const data = await ffmpeg.readFile(outputName);
    const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new TextEncoder().encode(data);
    return { file: new File([bytes], "combined.mp4", { type: "video/mp4" }) };
  } finally {
    if (progressHandler) ffmpeg.off("progress", progressHandler);
    for (const name of inputNames) {
      await ffmpeg.deleteFile(name).catch(() => {});
    }
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}
