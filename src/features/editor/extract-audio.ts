import { fetchFile } from "@ffmpeg/util";
import { getFFmpeg } from "@/features/editor/ffmpeg-instance";

/**
 * Pulls a video's own sound out into a plain AAC .m4a, for when the
 * browser's decodeAudioData can't read it straight from the video file.
 * Which containers it accepts varies by browser — a phone's QuickTime
 * .MOV is the case that matters most — and a failed decode used to mean
 * the edited clip quietly came out silent. An .m4a is one of the formats
 * every browser's decodeAudioData does read.
 *
 * Resolves null when the video has no sound to extract (ffmpeg exits
 * non-zero with no output stream) — silence is the right answer then.
 */
export async function extractAudioTrack(file: File): Promise<File | null> {
  const ffmpeg = await getFFmpeg();
  const inputName = "audio-input" + (file.name.match(/\.\w+$/)?.[0] ?? ".mp4");
  const outputName = "audio-output.m4a";

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    // Re-encoded rather than stream-copied: the source's audio might be
    // Opus (a WebM recording) or PCM, which an .m4a can't simply carry.
    const exitCode = await ffmpeg.exec([
      "-i",
      inputName,
      "-vn",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      outputName,
    ]);
    if (exitCode !== 0) return null;

    const data = await ffmpeg.readFile(outputName);
    // Same SharedArrayBuffer-backing re-wrap as compress-video.ts.
    const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new TextEncoder().encode(data);
    return bytes.byteLength > 0 ? new File([bytes], "audio.m4a", { type: "audio/mp4" }) : null;
  } finally {
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}
